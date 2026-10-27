import { describe, expect, it } from "vitest";
import { MediaUploadFileSchema } from "@/features/media/schemas/media.upload.schema";

describe("唯一写入契约及边界行为", () => {
  it("媒体上传规范化文件字段且大小仍要求非负整数", () => {
    expect(
      MediaUploadFileSchema.parse({
        name: " image.png ",
        size: 0,
        type: " image/png ",
      }),
    ).toEqual({
      name: "image.png",
      size: 0,
      type: "image/png",
    });
    expect(
      MediaUploadFileSchema.safeParse({
        name: "image",
        size: -1,
        type: "image/png",
      }).success,
    ).toBe(false);
  });
});

describe("media metadata policy", () => {
  const media = {
    name: "image.png",
    size: 1,
    type: "image/png",
  };
  it.each([
    "image/svg+xml",
    "video/mp4",
    "text/html",
    "application/octet-stream",
  ])("rejects unsupported MIME %s", (type) => {
    expect(MediaUploadFileSchema.safeParse({ ...media, type }).success).toBe(
      false,
    );
  });
  it.each([
    ["image/jpeg", "IMAGE.JPG"],
    ["image/jpeg", "image.jpeg"],
    ["image/png", "image.PNG"],
    ["image/gif", "image.gif"],
    ["image/webp", "image.webp"],
    ["image/avif", "image.avif"],
  ])("accepts %s with %s at the size boundary", (type, name) => {
    expect(
      MediaUploadFileSchema.safeParse({
        ...media,
        type,
        name,
        size: 20 * 1024 * 1024,
      }).success,
    ).toBe(true);
  });
  it("rejects oversized metadata", () => {
    expect(
      MediaUploadFileSchema.safeParse({ ...media, size: 20 * 1024 * 1024 + 1 })
        .success,
    ).toBe(false);
  });
});
