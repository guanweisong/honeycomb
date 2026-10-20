"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { MediaRecord, MediaConfirmResult } from "../types";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  MEDIA_MAX_BATCH_FILES,
  MediaUploadFileSchema,
  type MediaUploadFile,
} from "../upload-policy";
import type { MediaDeleteResult } from "../delete-result";

type SubmitMediaUploadOptions = {
  files: readonly File[];
  isCurrent?: () => boolean;
  beginUpload: (
    input: MediaUploadFile,
  ) => Promise<{ id: string; uploadUrl: string; expiresAt: string }>;
  uploadToStorage: (url: string, file: File) => Promise<void>;
  confirmUpload: (input: { id: string }) => Promise<MediaConfirmResult>;
};
export type FailedUpload = {
  id?: string;
  name: string;
  message: string;
  outcome: "failed" | "indeterminate";
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
  beginUpload,
  uploadToStorage,
  confirmUpload,
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
              let id: string | undefined;
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
                const operation = await beginUpload(parsed.data);
                id = operation.id;
                if (!isCurrent()) throw new Error("操作已过期");
                await uploadToStorage(operation.uploadUrl, file);
                if (!isCurrent()) throw new Error("操作已过期");
                const result = await confirmUpload({ id });
                if (result.state === "ready") return { media: result.media };
                return {
                  failed: {
                    id,
                    name: file.name,
                    message: result.message,
                    outcome:
                      result.state === "pending" ? "indeterminate" : "failed",
                  },
                };
              } catch (error) {
                return {
                  failed: {
                    id,
                    name: file.name,
                    message: id
                      ? "上传结果待确认，请在媒体管理中检查状态"
                      : error instanceof Error
                        ? error.message
                        : "上传失败，请稍后再试",
                    outcome: id ? "indeterminate" : "failed",
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
  | { state: "success" }
  | { state: "indeterminate"; message: string }
  | { state: "error"; message: string };
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
    const result = await destroy({
      ids: [id],
      acknowledgeUnknownReferences: true,
    });
    return result.success
      ? { state: "success" }
      : { state: "indeterminate", message: result.message };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "data" in error
        ? (error.data as { code?: string } | undefined)?.code
        : undefined;
    if (
      code &&
      [
        "CONFLICT",
        "BAD_REQUEST",
        "FORBIDDEN",
        "UNAUTHORIZED",
        "NOT_FOUND",
      ].includes(code)
    )
      return {
        state: "error",
        message: error instanceof Error ? error.message : "删除失败",
      };
    return {
      state: "indeterminate",
      message: "删除结果待确认，请检查状态后再操作",
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
  const begin = trpc.media.beginUpload.useMutation();
  const confirm = trpc.media.confirmUpload.useMutation();
  const reconcile = trpc.media.reconcile.useMutation();
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
        beginUpload: begin.mutateAsync,
        uploadToStorage,
        confirmUpload: confirm.mutateAsync,
        isCurrent: () => active.current && scope.current === startedScope,
      });
      if (!active.current || scope.current !== startedScope) return;
      setFailures("failed" in result ? (result.failed ?? []) : []);
      if (result.state === "success" || result.state === "partial") {
        if (result.state === "success")
          toast.success(`成功上传 ${result.media.length} 个文件`);
        else
          toast.error(
            `成功上传 ${result.media.length} 个文件，${result.failed.filter((f) => f.outcome === "failed").length} 个失败，${result.failed.filter((f) => f.outcome === "indeterminate").length} 个待确认：${result.message}`,
          );
        const last = result.media.at(-1);
        if (last && selection.current === startedSelection)
          onUploadComplete(last);
        await safeRefresh();
      } else if (result.state === "error") {
        toast.error(result.message);
        if (result.failed?.some((f) => f.id)) await safeRefresh();
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
    onDeleteComplete(id);
    const startedScope = scope.current;
    try {
      const result = await submitMediaDelete({
        id,
        destroy: destroy.mutateAsync,
      });
      if (!active.current || scope.current !== startedScope) return false;
      if (result.state === "success") {
        toast.success("删除成功");
      } else {
        toast.error(result.message);
        if (result.state === "error")
          setUnavailableIds((current) =>
            current.filter((value) => value !== id),
          );
      }
      if (result.state !== "error") await safeRefresh();
      return result.state === "success";
    } finally {
      busy.current.delete(id);
    }
  };
  const handleReconcile = async (
    id: string,
    acknowledgeUnknownReferences?: true,
  ) => {
    if (busy.current.has(id)) return false;
    busy.current.add(id);
    const startedScope = scope.current;
    try {
      const result = await reconcile.mutateAsync({
        id,
        ...(acknowledgeUnknownReferences
          ? { acknowledgeUnknownReferences }
          : {}),
      });
      if (!active.current || scope.current !== startedScope) return false;
      const success =
        "success" in result ? result.success : result.state === "ready";
      if (success) {
        toast.success("状态已确认");
        setFailures((current) => current.filter((f) => f.id !== id));
      } else if ("message" in result) toast.error(result.message);
      await safeRefresh();
      return success;
    } catch (error) {
      if (active.current && scope.current === startedScope)
        toast.error(error instanceof Error ? error.message : "状态检查失败");
      return false;
    } finally {
      busy.current.delete(id);
    }
  };
  return {
    fileInputRef,
    handleDelete,
    handleUpload,
    handleReconcile,
    loading,
    failures,
    unavailableIds,
  };
}
