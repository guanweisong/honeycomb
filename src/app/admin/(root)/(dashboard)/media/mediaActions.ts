"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { clientLogger } from "@/packages/infrastructure/observability/client";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";
import type { MediaEntity } from "@/packages/trpc/api/outputs";
import { trpc } from "@/packages/trpc/client/trpc";

type ImageMetadata = {
  width: number;
  height: number;
  color?: string;
};

type MediaUploadInput = {
  name: string;
  type: string;
  size: number;
  key: string;
  width: number | null;
  height: number | null;
  color: string | null;
};

type SubmitMediaUploadOptions = {
  files: readonly File[];
  getImageMetadata: (file: File) => Promise<ImageMetadata>;
  getPresignedUrl: (input: { name: string; type: string }) => Promise<{
    url: string;
    key: string;
  }>;
  uploadToStorage: (url: string, file: File) => Promise<void>;
  createMedia: (input: MediaUploadInput) => Promise<MediaEntity>;
};

export type MediaUploadActionResult =
  | { state: "empty" }
  | { state: "success"; media: MediaEntity[] }
  | { state: "error"; message: string };

export async function submitMediaUpload({
  files,
  getImageMetadata,
  getPresignedUrl,
  uploadToStorage,
  createMedia,
}: SubmitMediaUploadOptions): Promise<MediaUploadActionResult> {
  if (files.length === 0) return { state: "empty" };

  try {
    const media = await Promise.all(
      files.map(async (file) => {
        const metadata = file.type.startsWith("image/")
          ? await getImageMetadata(file)
          : { width: 0, height: 0 };
        const { url, key } = await getPresignedUrl({
          name: file.name,
          type: file.type,
        });

        await uploadToStorage(url, file);

        return createMedia({
          name: file.name,
          type: file.type,
          size: file.size,
          key,
          width: metadata.width || null,
          height: metadata.height || null,
          color: metadata.color || null,
        });
      }),
    );

    return { state: "success", media };
  } catch (error) {
    return {
      state: "error",
      message: error instanceof Error ? error.message : "上传失败，请稍后再试",
    };
  }
}

type SubmitMediaDeleteOptions = {
  id: string;
  destroy: (input: { ids: string[] }) => Promise<{ success: boolean }>;
};

export type MediaDeleteActionResult =
  | { state: "success" }
  | { state: "noop" }
  | { state: "error" };

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
  onUploadComplete: (media: MediaEntity) => void;
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
    const result = await submitMediaUpload({
      files: files ? Array.from(files) : [],
      getImageMetadata,
      getPresignedUrl: getPresignedUrl.mutateAsync,
      uploadToStorage,
      createMedia: uploadMedia.mutateAsync,
    });

    if (result.state === "success") {
      toast.success(`成功上传 ${result.media.length} 个文件`);
      onUploadComplete(result.media[result.media.length - 1]);
      refetch();
    } else if (result.state === "error") {
      toast.error(result.message);
    }
    setLoading(false);
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
