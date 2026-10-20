// @vitest-environment node
import { expect, it } from "vitest";
import { beginMediaUpload } from "../server";
import {
  mediaRepositoryFixture,
  mediaStorageFixture,
} from "@tests/helpers/media-lifecycle";
it("never signs a capability before a durable upload record returns", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  repo.begin.mockRejectedValue(new Error("response lost"));
  await expect(
    beginMediaUpload(
      repo,
      storage,
      { name: "a.png", type: "image/png", size: 1 },
      "actor",
    ),
  ).rejects.toThrow();
  expect(storage.getPresignedUrl).not.toHaveBeenCalled();
});
it("signs only the persisted temporary key and returns no cleanup capability", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  const result = await beginMediaUpload(
    repo,
    storage,
    { name: "a.png", type: "image/png", size: 3 },
    "actor",
  );
  expect(storage.getPresignedUrl).toHaveBeenCalledWith({
    Key: "temporary/upload.png",
    ContentType: "image/png",
    ContentLength: 3,
  });
  expect(result).not.toHaveProperty("cleanupUrl");
  expect(result).not.toHaveProperty("key");
});
