import { describe, expect, it } from "vitest";
import { CommentSiteSchema } from "@/features/comment/schemas/comment.insert.schema";
import { LinkInsertSchema } from "@/features/link/application/write-schema";
import { SettingUpdateSchema } from "@/features/setting/schemas/setting.update.schema";
import { MediaInsertSchema } from "@/features/media/application/write-schema";

describe("safe persisted links", () => {
  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://example.test/a"])(
    "rejects %s at every link consumer",
    (url) => {
      expect(CommentSiteSchema.safeParse(url).success).toBe(false);
      expect(
        LinkInsertSchema.safeParse({
          name: "link",
          url,
          logo: "https://example.test/logo.png",
        }).success,
      ).toBe(false);
      expect(
        LinkInsertSchema.safeParse({
          name: "link",
          url: "https://example.test",
          logo: url,
        }).success,
      ).toBe(false);
      expect(
        SettingUpdateSchema.shape.siteRecordUrl.safeParse(url).success,
      ).toBe(false);
    },
  );
  it("accepts HTTP(S) and retains optional empty site fields", () => {
    expect(CommentSiteSchema.parse(" https://example.test ")).toBe(
      "https://example.test",
    );
    expect(CommentSiteSchema.parse(" ")).toBeUndefined();
    expect(SettingUpdateSchema.shape.siteRecordUrl.safeParse("").success).toBe(
      true,
    );
    expect(
      LinkInsertSchema.safeParse({
        name: "link",
        url: "http://example.test",
        logo: "https://example.test/logo.png",
      }).success,
    ).toBe(true);
  });
});

describe("media metadata policy", () => {
  const media = {
    name: "image.png",
    key: "image.png",
    size: 1,
    type: "image/png",
  };
  it.each([
    "image/svg+xml",
    "video/mp4",
    "text/html",
    "application/octet-stream",
  ])("rejects unsupported MIME %s", (type) => {
    expect(MediaInsertSchema.safeParse({ ...media, type }).success).toBe(false);
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
      MediaInsertSchema.safeParse({
        ...media,
        type,
        name,
        size: 20 * 1024 * 1024,
      }).success,
    ).toBe(true);
  });
  it("rejects oversized metadata", () => {
    expect(
      MediaInsertSchema.safeParse({ ...media, size: 20 * 1024 * 1024 + 1 })
        .success,
    ).toBe(false);
  });
});
