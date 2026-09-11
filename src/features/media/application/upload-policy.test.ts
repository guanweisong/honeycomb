import { describe, expect, it, vi } from "vitest";
import { createMedia, getMediaPresignedUrl } from "./media-use-cases";

describe("media application policy", () => {
  it.each([
    { name: "file.html", type: "image/png" },
    { name: "file.svg", type: "image/png" },
    { name: "file.jpg", type: "image/png" },
    { name: "file", type: "image/png" },
  ] as const)(
    "rejects invalid filename/MIME pair $name at both application boundaries",
    async ({ name, type }) => {
      const repository = { create: vi.fn() };
      await expect(
        getMediaPresignedUrl(storage, name, type, 10),
      ).rejects.toThrow();
      await expect(async () =>
        createMedia(repository, { name, type, size: 10, key: "file.png" }),
      ).rejects.toThrow();
      expect(repository.create).not.toHaveBeenCalled();
    },
  );
  const storage = {
    getPresignedUrl: vi.fn().mockResolvedValue("https://storage.test/put"),
    getPresignedDeleteUrl: vi
      .fn()
      .mockResolvedValue("https://storage.test/delete"),
    deleteObjects: vi.fn(),
  };
  it.each([
    { type: "image/svg+xml", size: 1 },
    { type: "image/png", size: 20971521 },
  ])("rejects invalid presign input before storage", async ({ type, size }) => {
    storage.getPresignedUrl.mockClear();
    await expect(
      getMediaPresignedUrl(storage, "file.png", type, size),
    ).rejects.toThrow();
    expect(storage.getPresignedUrl).not.toHaveBeenCalled();
  });
  it("provides cleanup capability and distinct keys for simultaneous same-name uploads", async () => {
    const [first, second] = await Promise.all([
      getMediaPresignedUrl(storage, "file.png", "image/png", 10),
      getMediaPresignedUrl(storage, "file.png", "image/png", 10),
    ]);
    expect(first.cleanupUrl).toBe("https://storage.test/delete");
    expect(first.key).not.toBe(second.key);
    expect(storage.getPresignedUrl).toHaveBeenCalledWith({
      Key: first.key,
      ContentType: "image/png",
      ContentLength: 10,
    });
    expect(storage.getPresignedDeleteUrl).toHaveBeenCalledWith(first.key);
  });
  it("rejects metadata bypassing transport validation", async () => {
    const repository = { create: vi.fn() };
    await expect(async () =>
      createMedia(repository, {
        name: "large.png",
        key: "large.png",
        type: "image/png",
        size: 20971521,
      }),
    ).rejects.toThrow();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
