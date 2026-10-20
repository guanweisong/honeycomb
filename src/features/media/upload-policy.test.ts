// @vitest-environment node
import { expect, it } from "vitest";
import { beginMediaUpload } from "./server";
import { MediaUploadFileSchema } from "./upload-policy";
import {
  mediaRepositoryFixture,
  mediaStorageFixture,
} from "@tests/helpers/media-lifecycle";
it.each(["file.html", "file.svg", "file.jpg", "file"])(
  "rejects filename/MIME mismatch %s before persistence or signing",
  async (name) => {
    const repo = mediaRepositoryFixture();
    const storage = mediaStorageFixture();
    await expect(
      beginMediaUpload(
        repo,
        storage,
        { name, type: "image/png", size: 10 },
        "actor",
      ),
    ).rejects.toThrow();
    expect(repo.begin).not.toHaveBeenCalled();
    expect(storage.getPresignedUrl).not.toHaveBeenCalled();
  },
);
it.each([
  { name: "a.svg", type: "image/svg+xml", size: 1 },
  { name: "a.png", type: "image/png", size: 20971521 },
])("rejects unsupported or oversized input", (input) => {
  expect(MediaUploadFileSchema.safeParse(input).success).toBe(false);
});
