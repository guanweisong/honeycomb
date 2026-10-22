import { z } from "zod";
import { requiredString } from "@/lib/validation/validation";
import {
  MEDIA_MIME_TYPES,
  MEDIA_MAX_BYTES,
} from "../types/media.upload-policy";

const extensionsByMime: Record<
  (typeof MEDIA_MIME_TYPES)[number],
  readonly string[]
> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
};

/** 预签名、元数据创建与客户端上传共享的文件规则。 */
export const MediaUploadFileSchema = z
  .object({
    name: requiredString("文件名不能为空"),
    type: z
      .string()
      .trim()
      .pipe(
        z.enum(MEDIA_MIME_TYPES, {
          message: "仅支持 JPEG、PNG、GIF、WebP、AVIF 图片",
        }),
      ),
    size: z
      .number()
      .int()
      .nonnegative()
      .max(MEDIA_MAX_BYTES, "每个文件不能超过 20 MiB"),
  })
  .refine(
    ({ name, type }) => {
      const extension = name.includes(".")
        ? name.split(".").at(-1)?.toLowerCase()
        : undefined;
      return (
        extension !== undefined && extensionsByMime[type].includes(extension)
      );
    },
    {
      message: "文件扩展名必须与图片类型匹配（jpg/jpeg/png/gif/webp/avif）",
      path: ["name"],
    },
  );

export const MediaUploadIntentInputSchema = MediaUploadFileSchema.safeExtend({
  sha256: z.string().regex(/^[a-f0-9]{64}$/, "无效的 SHA-256 摘要"),
});

export const MediaRegisterUploadSchema = z.object({
  intent: z.string().min(1),
});
