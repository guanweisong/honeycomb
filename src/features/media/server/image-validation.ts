import "server-only";
import sharp from "sharp";
import { MEDIA_MAX_BYTES } from "../upload-policy";

const MAX_PIXELS = 40_000_000;
const MAX_FRAMES = 100;
const mimeByFormat: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heif: "image/avif",
};
/** Decode the immutable candidate, not browser metadata or a mutable upload key. */
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

// Per-process admission, not a queue or durable work system. Acquire before object GET.
let activeValidations = 0;
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
