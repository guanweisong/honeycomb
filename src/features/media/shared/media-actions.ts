"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { MediaRecord } from "../types";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  MEDIA_MAX_BATCH_FILES,
  MediaUploadFileSchema,
  type MediaUploadIntentInput,
} from "../upload-policy";
import type { MediaDeleteResult } from "../delete-result";

type SubmitMediaUploadOptions = {
  files: readonly File[];
  isCurrent?: () => boolean;
  prepareUpload: (
    input: MediaUploadIntentInput,
  ) => Promise<{ intent: string; uploadUrl: string; expiresAt: string }>;
  uploadToStorage: (url: string, file: File) => Promise<void>;
  registerUpload: (input: { intent: string }) => Promise<MediaRecord>;
};
export type FailedUpload = {
  name: string;
  message: string;
};
export type MediaUploadActionResult =
  | { state: "empty" }
  | { state: "success"; media: MediaRecord[] }
  | {
      state: "partial";
      media: MediaRecord[];
      failed: FailedUpload[];
      message: string;
    }
  | { state: "error"; message: string; failed?: FailedUpload[] };

export async function submitMediaUpload({
  files,
  prepareUpload,
  uploadToStorage,
  registerUpload,
  isCurrent = () => true,
}: SubmitMediaUploadOptions): Promise<MediaUploadActionResult> {
  if (!files.length) return { state: "empty" };
  if (files.length > MEDIA_MAX_BATCH_FILES)
    return { state: "error", message: "每批最多上传 20 个文件" };
  const results: { media?: MediaRecord; failed?: FailedUpload }[] = [];
  for (let offset = 0; offset < files.length; offset += 2) {
    results.push(
      ...(await Promise.all(
        files
          .slice(offset, offset + 2)
          .map(
            async (
              file,
            ): Promise<{ media?: MediaRecord; failed?: FailedUpload }> => {
              try {
                const parsed = MediaUploadFileSchema.safeParse({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                });
                if (!parsed.success)
                  throw new Error(
                    parsed.error.issues[0]?.message ?? "无效的媒体文件",
                  );
                if (!isCurrent()) throw new Error("操作已过期");
                const digest = await crypto.subtle.digest(
                  "SHA-256",
                  await file.arrayBuffer(),
                );
                const sha256 = Array.from(new Uint8Array(digest), (byte) =>
                  byte.toString(16).padStart(2, "0"),
                ).join("");
                if (!isCurrent()) throw new Error("操作已过期");
                const operation = await prepareUpload({
                  ...parsed.data,
                  sha256,
                });
                if (!isCurrent()) throw new Error("操作已过期");
                await uploadToStorage(operation.uploadUrl, file);
                if (!isCurrent()) throw new Error("操作已过期");
                return {
                  media: await registerUpload({ intent: operation.intent }),
                };
              } catch (error) {
                return {
                  failed: {
                    name: file.name,
                    message: `${error instanceof Error ? error.message : "上传失败"}；请人工核对后重试`,
                  },
                };
              }
            },
          ),
      )),
    );
  }
  const media = results.flatMap((result) =>
    result.media ? [result.media] : [],
  );
  const failed = results.flatMap((result) =>
    result.failed ? [result.failed] : [],
  );
  if (!failed.length) return { state: "success", media };
  const message = failed.map((f) => `${f.name}: ${f.message}`).join("；");
  return media.length
    ? { state: "partial", media, failed, message }
    : { state: "error", failed, message };
}
export type MediaDeleteActionResult =
  { state: "success" } | { state: "error"; message: string };
export async function submitMediaDelete({
  id,
  destroy,
}: {
  id: string;
  destroy: (input: {
    ids: string[];
    acknowledgeUnknownReferences: true;
  }) => Promise<MediaDeleteResult>;
}): Promise<MediaDeleteActionResult> {
  try {
    await destroy({ ids: [id], acknowledgeUnknownReferences: true });
    return { state: "success" };
  } catch (error) {
    return {
      state: "error",
      message: `${error instanceof Error ? error.message : "删除失败"}；删除结果可能未完成，请人工核对后再重试`,
    };
  }
}
async function uploadToStorage(url: string, file: File) {
  const response = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!response.ok) throw new Error(`文件 ${file.name} 上传到存储失败`);
}
type UseMediaActionsOptions = {
  refetch: () => unknown;
  onUploadComplete: (media: MediaRecord) => void;
  onDeleteComplete: (id: string) => void;
  scopeKey?: string;
  selectionKey?: string;
};
export function useMediaActions({
  refetch,
  onUploadComplete,
  onDeleteComplete,
  scopeKey,
  selectionKey,
}: UseMediaActionsOptions) {
  const [loading, setLoading] = useState(false);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
  const [failures, setFailures] = useState<FailedUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const scope = useRef(scopeKey);
  useLayoutEffect(() => {
    scope.current = scopeKey;
  }, [scopeKey]);
  const selection = useRef(selectionKey);
  useLayoutEffect(() => {
    selection.current = selectionKey;
  }, [selectionKey]);
  const uploadBusy = useRef(false);
  const busy = useRef(new Set<string>());
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const destroy = trpc.media.destroy.useMutation();
  const prepare = trpc.media.prepareUpload.useMutation();
  const register = trpc.media.registerUpload.useMutation();
  const safeRefresh = async () => {
    try {
      await refetch();
    } catch {
      /* A refresh failure never replays a storage operation. */
    }
  };
  const handleUpload = async (files: FileList | null) => {
    if (uploadBusy.current) return;
    uploadBusy.current = true;
    setLoading(true);
    const startedScope = scope.current;
    const startedSelection = selection.current;
    try {
      const result = await submitMediaUpload({
        files: files ? Array.from(files) : [],
        prepareUpload: prepare.mutateAsync,
        uploadToStorage,
        registerUpload: register.mutateAsync,
        isCurrent: () => active.current && scope.current === startedScope,
      });
      if (!active.current || scope.current !== startedScope) return;
      setFailures("failed" in result ? (result.failed ?? []) : []);
      if (result.state === "success" || result.state === "partial") {
        if (result.state === "success")
          toast.success(`成功上传 ${result.media.length} 个文件`);
        else
          toast.error(
            `成功上传 ${result.media.length} 个文件，${result.failed.length} 个失败：${result.message}`,
          );
        const last = result.media.at(-1);
        if (last && selection.current === startedSelection)
          onUploadComplete(last);
        await safeRefresh();
      } else if (result.state === "error") {
        toast.error(result.message);
        await safeRefresh();
      }
    } finally {
      uploadBusy.current = false;
      if (active.current) {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };
  const handleDelete = async (id: string) => {
    if (busy.current.has(id)) return false;
    busy.current.add(id);
    setUnavailableIds((current) => [...new Set([...current, id])]);
    const startedScope = scope.current;
    try {
      const result = await submitMediaDelete({
        id,
        destroy: destroy.mutateAsync,
      });
      if (!active.current || scope.current !== startedScope) return false;
      if (result.state === "success") {
        onDeleteComplete(id);
        toast.success("删除成功");
      } else {
        toast.error(result.message);
        setUnavailableIds((current) => current.filter((value) => value !== id));
      }
      await safeRefresh();
      return result.state === "success";
    } finally {
      busy.current.delete(id);
    }
  };
  return {
    fileInputRef,
    handleDelete,
    handleUpload,
    loading,
    failures,
    unavailableIds,
  };
}
