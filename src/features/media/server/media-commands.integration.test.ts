import { destroyMedia } from "@/features/media/server/media-delete";
import { prepareMediaUpload } from "@/features/media/server/media-upload";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
describe("feature persistence contracts", () => {
  const invalidator = () => ({
    invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
  });
  it("media commands coordinate repository and storage", async () => {
    const id = "507f1f77bcf86cd799439011";
    const { mediaRepositoryFixture, mediaStorageFixture } =
      await import("@tests/helpers/media-registration");
    const repository = mediaRepositoryFixture();
    const storage = mediaStorageFixture();
    storage.headObject.mockResolvedValue(null);
    const file = {
      name: "a.png",
      size: 1,
      type: "image/png" as const,
      sha256: "a".repeat(64),
    };
    const prepared = await prepareMediaUpload(
      repository,
      storage,
      file,
      "author",
    );
    expect(prepared).toMatchObject({
      intent: expect.any(String),
      uploadUrl: "https://upload.test/temp",
      expiresAt: expect.any(String),
    });
    expect(repository.authorizeUpload).toHaveBeenCalledWith("author");
    expect(storage.getPresignedUrl).toHaveBeenCalledWith({
      Key: expect.stringMatching(/^temporary\//),
      ContentType: "image/png",
      ContentLength: 1,
    });
    await expect(
      destroyMedia(repository, storage, [id], invalidator(), "author", true),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(repository.deleteWithStorage).toHaveBeenCalledWith(
      [id],
      "author",
      expect.any(Function),
    );
    expect(storage.deleteObjects).toHaveBeenCalledWith(["media/final.png"]);
  });
});
