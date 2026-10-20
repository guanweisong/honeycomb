// @vitest-environment node
import { expect, it } from "vitest";
import sharp from "sharp";
import { confirmMediaUpload } from "../server";
import {
  mediaRepositoryFixture,
  mediaStorageFixture,
} from "@tests/helpers/media-lifecycle";
it("does not perform a copy after uncertain database claim", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  repo.claimCopy.mockRejectedValue(new Error("response lost"));
  expect((await confirmMediaUpload(repo, storage, "id", "actor")).state).toBe(
    "pending",
  );
  expect(storage.copyCandidate).not.toHaveBeenCalled();
});
it("retains candidate when verified READY database response is lost", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  const bytes = await sharp({
    create: { width: 1, height: 1, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const row = await repo.findForUpload("id", "actor");
  row.size = bytes.length;
  storage.headObject.mockResolvedValue({
    size: bytes.length,
    type: "image/png",
  });
  storage.readObject.mockResolvedValue(bytes);
  repo.bindReady.mockRejectedValue(new Error("response lost"));
  expect((await confirmMediaUpload(repo, storage, "id", "actor")).state).toBe(
    "pending",
  );
  expect(storage.deleteObjects).not.toHaveBeenCalled();
});
it("returns pending before GET when process validation capacity is exhausted", async () => {
  const { tryAcquireMediaValidation } = await import("./image-validation");
  const first = tryAcquireMediaValidation();
  const second = tryAcquireMediaValidation();
  try {
    const repo = mediaRepositoryFixture();
    const storage = mediaStorageFixture();
    repo.claimCopy.mockResolvedValue(null);
    expect((await confirmMediaUpload(repo, storage, "id", "actor")).state).toBe(
      "pending",
    );
    expect(storage.headObject).not.toHaveBeenCalled();
    expect(storage.readObject).not.toHaveBeenCalled();
    expect(repo.note).not.toHaveBeenCalledWith(
      "id",
      "UPLOADING",
      "INVALID_IMAGE",
    );
  } finally {
    first?.();
    second?.();
  }
});
