// @vitest-environment node
import { expect, it } from "vitest";
import { prepareMediaUpload } from "@/features/media/server/media-upload";
import {
  mediaRepositoryFixture,
  mediaStorageFixture,
} from "@tests/helpers/media-registration";
it("does not sign uploads after current permission is revoked", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  repo.authorizeUpload.mockRejectedValue(new Error("forbidden"));
  await expect(
    prepareMediaUpload(
      repo,
      storage,
      { name: "a.png", type: "image/png", size: 3, sha256: "a".repeat(64) },
      "actor",
    ),
  ).rejects.toThrow();
  expect(storage.getPresignedUrl).not.toHaveBeenCalled();
});
it("prepares only temporary capability without inserting a media row", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  const result = await prepareMediaUpload(
    repo,
    storage,
    { name: "a.png", type: "image/png", size: 3, sha256: "a".repeat(64) },
    "actor",
  );
  expect(result.intent).toEqual(expect.any(String));
  expect(storage.getPresignedUrl).toHaveBeenCalledWith({
    Key: expect.stringMatching(/^temporary\//),
    ContentType: "image/png",
    ContentLength: 3,
  });
  expect(repo.insertRegistered).not.toHaveBeenCalled();
  expect(result).not.toHaveProperty("key");
});

it("rejects an invalid file digest before authorization or signing", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  await expect(
    prepareMediaUpload(
      repo,
      storage,
      { name: "a.png", type: "image/png", size: 3, sha256: "A".repeat(64) },
      "actor",
    ),
  ).rejects.toThrow("无效的 SHA-256 摘要");
  expect(repo.authorizeUpload).not.toHaveBeenCalled();
  expect(storage.getPresignedUrl).not.toHaveBeenCalled();
});
