"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { clientLogger } from "@/packages/infrastructure/observability/client";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";
import type { MediaViewModel } from "../media-view-model";
import { trpc } from "@/packages/trpc/client/trpc";
import {
  MEDIA_MAX_BATCH_FILES,
  MediaUploadFileSchema,
  type MediaUploadFile,
} from "../../application/upload-policy";
import type { MediaEntity } from "../../application/write-schema";
import type { MediaCreateResult } from "../../application/upload-result";

type ImageMetadata = {
  width: number;
  height: number;
  color?: string;
};

type SubmitMediaUploadOptions = {
  files: readonly File[];
  getImageMetadata: (file: File) => Promise<ImageMetadata>;
  getPresignedUrl: (input: MediaUploadFile) => Promise<{
    url: string;
    key: string;
  }>;
  uploadToStorage: (url: string, file: File) => Promise<void>;
  createMedia: (input: MediaEntity) => Promise<MediaCreateResult>;
  cleanupObject: (key: string) => Promise<void>;
};

type FailedUpload = {
  name: string;
  message: string;
  cleanupFailed: boolean;
  outcome: "failed" | "indeterminate";
};
export type MediaUploadActionResult =
  | { state: "empty" }
  | { state: "success"; media: MediaViewModel[] }
  | {
      state: "partial";
      media: MediaViewModel[];
      failed: FailedUpload[];
      message: string;
    }
  | { state: "error"; message: string; failed?: FailedUpload[] };

export async function submitMediaUpload({
  files,
  getImageMetadata,
  getPresignedUrl,
  uploadToStorage,
  createMedia,
  cleanupObject,
}: SubmitMediaUploadOptions): Promise<MediaUploadActionResult> {
  if (files.length === 0) return { state: "empty" };
  if (files.length > MEDIA_MAX_BATCH_FILES)
    return { state: "error", message: "每批最多上传 20 个文件" };
  const results = await Promise.all(
    files.map(async (file) => {
      let metadataStarted = false;
      try {
        const parsed = MediaUploadFileSchema.safeParse({
          name: file.name,
          type: file.type,
          size: file.size,
        });
        if (!parsed.success)
          throw new Error(parsed.error.issues[0]?.message ?? "无效的媒体文件");
        const metadata = await getImageMetadata(file);
        const { url, key } = await getPresignedUrl(parsed.data);
        await uploadToStorage(url, file);
        metadataStarted = true;
        const result = await createMedia({
          ...parsed.data,
          key,
          width: metadata.width || null,
          height: metadata.height || null,
          color: metadata.color || null,
        });
        if (result.state === "created") return { media: result.media };
        let cleanupFailed = false;
        if (result.state === "rejected") {
          try {
            await cleanupObject(key);
          } catch {
            cleanupFailed = true;
          }
        }
        return {
          failed: {
            name: file.name,
            message: result.message,
            cleanupFailed,
            outcome:
              result.state === "rejected"
                ? ("failed" as const)
                : ("indeterminate" as const),
          },
        };
      } catch (error) {
        return {
          failed: {
            name: file.name,
            message: metadataStarted
              ? "保存结果待确认，请刷新媒体列表后核对"
              : error instanceof Error
                ? error.message
                : "上传失败，请稍后再试",
            cleanupFailed: false,
            outcome: metadataStarted
              ? ("indeterminate" as const)
              : ("failed" as const),
          },
        };
      }
    }),
  );

  const media = results.flatMap((result) =>
    result.media ? [result.media] : [],
  );
  const failed = results.flatMap((result) =>
    result.failed ? [result.failed] : [],
  );
  if (!failed.length) return { state: "success", media };
  const message = failed
    .map(
      (failure) =>
        `${failure.name}: ${failure.message}${failure.cleanupFailed ? "（存储清理失败）" : ""}`,
    )
    .join("；");
  return media.length
    ? { state: "partial", media, failed, message }
    : { state: "error", failed, message };
}

type SubmitMediaDeleteOptions = {
  id: string;
  destroy: (input: { ids: string[] }) => Promise<{ success: boolean }>;
};

export type MediaDeleteActionResult =
  { state: "success" } | { state: "noop" } | { state: "error" };

export async function submitMediaDelete({
  id,
  destroy,
}: SubmitMediaDeleteOptions): Promise<MediaDeleteActionResult> {
  try {
    const result = await destroy({ ids: [id] });
    return result.success ? { state: "success" } : { state: "noop" };
  } catch {
    return { state: "error" };
  }
}

function getImageMetadata(file: File): Promise<ImageMetadata> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({ width: 0, height: 0 });
      return;
    }

    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let color: string | undefined;
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) {
          canvas.width = 1;
          canvas.height = 1;
          context.drawImage(image, 0, 0, image.width, image.height, 0, 0, 1, 1);
          const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
          color = `rgb(${red},${green},${blue})`;
        }
      } catch {
        clientLogger.warn(LogEvent.clientError, {
          operation: "media.extract-image-color",
          outcome: "error",
        });
      }

      resolve({ width: image.width, height: image.height, color });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 0, height: 0 });
    };
    image.src = objectUrl;
  });
}

async function uploadToStorage(url: string, file: File) {
  const response = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!response.ok) {
    throw new Error(`文件 ${file.name} 上传到存储失败`);
  }
}

type UseMediaActionsOptions = {
  refetch: () => unknown;
  onUploadComplete: (media: MediaViewModel) => void;
  onDeleteComplete: () => void;
};

export function useMediaActions({
  refetch,
  onUploadComplete,
  onDeleteComplete,
}: UseMediaActionsOptions) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const destroyMedia = trpc.media.destroy.useMutation();
  const getPresignedUrl = trpc.media.getPresignedUrl.useMutation();
  const uploadMedia = trpc.media.upload.useMutation();

  const handleUpload = async (files: FileList | null) => {
    setLoading(true);
    const cleanupUrls = new Map<string, string>();
    const result = await submitMediaUpload({
      files: files ? Array.from(files) : [],
      getImageMetadata,
      getPresignedUrl: async (input) => {
        const signed = await getPresignedUrl.mutateAsync(input);
        cleanupUrls.set(signed.key, signed.cleanupUrl);
        return signed;
      },
      uploadToStorage,
      createMedia: uploadMedia.mutateAsync,
      cleanupObject: async (key) => {
        const url = cleanupUrls.get(key);
        if (!url) throw new Error("缺少清理地址");
        const response = await fetch(url, { method: "DELETE" });
        if (!response.ok) throw new Error("存储清理失败");
      },
    });

    if (result.state === "success" || result.state === "partial") {
      if (result.state === "success")
        toast.success(`成功上传 ${result.media.length} 个文件`);
      else
        toast.error(
          `成功上传 ${result.media.length} 个文件，${result.failed.filter((failure) => failure.outcome === "failed").length} 个失败，${result.failed.filter((failure) => failure.outcome === "indeterminate").length} 个待确认：${result.message}`,
        );
      const lastMedia = result.media.at(-1);
      if (lastMedia) onUploadComplete(lastMedia);
      refetch();
    } else if (result.state === "error") {
      toast.error(result.message);
      if (result.failed?.some((failure) => failure.outcome === "indeterminate"))
        refetch();
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    const result = await submitMediaDelete({
      id,
      destroy: destroyMedia.mutateAsync,
    });

    if (result.state === "success") {
      toast.success("删除成功");
      onDeleteComplete();
      refetch();
    } else if (result.state === "error") {
      toast.error("删除失败");
    }
  };

  return { fileInputRef, handleDelete, handleUpload, loading };
}
/**
 * 媒体上传、删除及相关客户端 Mutation 编排。
 */
