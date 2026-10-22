import "server-only";
import sharp from "sharp";
import { MEDIA_MAX_BYTES } from "@/features/media/types/media.upload-policy";

const MAX_PIXELS = 40_000_000;
const MAX_FRAMES = 100;
const mimeByFormat: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heif: "image/avif",
};
/** 解码完整候选字节并推导元数据，不信任浏览器声明或仍可覆盖的临时上传对象。 */
export async function validateMediaImage(
  bytes: Uint8Array,
  expected: { type: string; size: number },
) {
  if (
    !bytes.byteLength ||
    bytes.byteLength > MEDIA_MAX_BYTES ||
    bytes.byteLength !== expected.size
  )
    throw new Error("INVALID_SIZE");
  const image = sharp(bytes, {
    animated: true,
    failOn: "warning",
    limitInputPixels: MAX_PIXELS,
  });
  const metadata = await image.metadata();
  const type = metadata.format ? mimeByFormat[metadata.format] : undefined;
  if (
    !type ||
    type !== expected.type ||
    (metadata.format === "heif" && metadata.compression !== "av1")
  )
    throw new Error("INVALID_TYPE");
  const frames = metadata.pages ?? 1;
  const width = metadata.width;
  const height = metadata.pageHeight ?? metadata.height;
  if (
    !width ||
    !height ||
    frames > MAX_FRAMES ||
    width * height * frames > MAX_PIXELS
  )
    throw new Error("INVALID_DIMENSIONS");
  // Force a full decode of every frame; metadata() alone accepts some truncated images.
  await image.raw().toBuffer();
  return { type, size: bytes.byteLength, width, height, color: null };
}

let activeValidations = 0;
/** 仅限制本进程同时缓冲/解码的数量；GET 前取得名额，不是跨实例锁或持久任务队列。 */
export function tryAcquireMediaValidation(): (() => void) | null {
  if (activeValidations >= 2) return null;
  activeValidations += 1;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      activeValidations -= 1;
    }
  };
}
