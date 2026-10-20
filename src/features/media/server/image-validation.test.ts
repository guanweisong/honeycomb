// @vitest-environment node
import { expect, it } from "vitest";
import sharp from "sharp";
import { validateMediaImage } from "./image-validation";
it("decodes candidate bytes and derives actual dimensions", async () => {
  const bytes = await sharp({
    create: { width: 2, height: 3, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  expect(
    await validateMediaImage(bytes, { type: "image/png", size: bytes.length }),
  ).toMatchObject({
    width: 2,
    height: 3,
    type: "image/png",
    size: bytes.length,
  });
});
it("rejects forged type, size and malformed bytes", async () => {
  const bytes = await sharp({
    create: { width: 2, height: 3, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await expect(
    validateMediaImage(bytes, { type: "image/jpeg", size: bytes.length }),
  ).rejects.toThrow();
  await expect(
    validateMediaImage(bytes, { type: "image/png", size: 1 }),
  ).rejects.toThrow();
  await expect(
    validateMediaImage(Buffer.from("not an image"), {
      type: "image/png",
      size: 12,
    }),
  ).rejects.toThrow();
});
it.each(["jpeg", "png", "gif", "webp", "avif"] as const)(
  "fully decodes supported %s bytes",
  async (format) => {
    const bytes = await sharp({
      create: { width: 2, height: 3, channels: 3, background: "red" },
    })
      .toFormat(format)
      .toBuffer();
    expect(
      await validateMediaImage(bytes, {
        type: `image/${format}`,
        size: bytes.length,
      }),
    ).toMatchObject({ width: 2, height: 3 });
  },
);
it("rejects truncated image data even if the declared byte count matches", async () => {
  const png = await sharp({
    create: { width: 30, height: 30, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const bytes = png.subarray(0, Math.floor(png.length * 0.7));
  await expect(
    validateMediaImage(bytes, { type: "image/png", size: bytes.length }),
  ).rejects.toThrow();
});
it("admits at most two buffered validation attempts and releases slots", async () => {
  const { tryAcquireMediaValidation } = await import("./image-validation");
  const first = tryAcquireMediaValidation();
  const second = tryAcquireMediaValidation();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(tryAcquireMediaValidation()).toBeNull();
  first?.();
  first?.();
  const third = tryAcquireMediaValidation();
  expect(third).not.toBeNull();
  second?.();
  third?.();
});
