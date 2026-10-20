// @vitest-environment node
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import sharp from "sharp";
import { registerMediaUpload } from "../server";
import { createUploadIntent } from "./upload-intent";
import {
  mediaRepositoryFixture,
  mediaStorageFixture,
  mediaRow,
} from "@tests/helpers/media-registration";
async function setup() {
  const bytes = await sharp({
    create: { width: 1, height: 1, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const { intent } = createUploadIntent(
    {
      name: "a.png",
      type: "image/png",
      size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
    "actor",
  );
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  storage.readObject.mockResolvedValue(bytes);
  return { bytes, intent, repo, storage };
}
it("publishes the exact validated bytes to a fresh key on each manual retry", async () => {
  const { bytes, intent, repo, storage } = await setup();
  await registerMediaUpload(repo, storage, intent, "actor");
  await registerMediaUpload(repo, storage, intent, "actor");
  expect(storage.putValidatedObject.mock.calls[0]?.[1]).toBe(bytes);
  expect(storage.putValidatedObject.mock.calls[0]?.[0]).not.toBe(
    storage.putValidatedObject.mock.calls[1]?.[0],
  );
  expect(repo.insertRegistered).toHaveBeenCalledTimes(2);
});
it("does not insert or HEAD-recover an uncertain final PUT", async () => {
  const { intent, repo, storage } = await setup();
  storage.putValidatedObject.mockRejectedValue(new Error("timeout"));
  await expect(
    registerMediaUpload(repo, storage, intent, "actor"),
  ).rejects.toThrow("结果无法确认");
  expect(repo.insertRegistered).not.toHaveBeenCalled();
  expect(storage.headObject).not.toHaveBeenCalled();
  expect(storage.deleteObjects).not.toHaveBeenCalled();
});
it("never cleans a candidate after uncertain database commit", async () => {
  const { intent, repo, storage } = await setup();
  repo.insertRegistered.mockRejectedValue(new Error("response lost"));
  await expect(
    registerMediaUpload(repo, storage, intent, "actor"),
  ).rejects.toThrow("结果无法确认");
  expect(storage.deleteObjects).not.toHaveBeenCalled();
});
it("returns an existing record unchanged without reading or writing storage", async () => {
  const { intent, repo, storage } = await setup();
  const row = mediaRow();
  repo.findRegistered.mockResolvedValue(row);
  expect(await registerMediaUpload(repo, storage, intent, "actor")).toEqual(
    row,
  );
  expect(storage.readObject).not.toHaveBeenCalled();
  expect(storage.putValidatedObject).not.toHaveBeenCalled();
});
it("rejects overwritten bytes before final PUT", async () => {
  const { intent, repo, storage, bytes } = await setup();
  storage.readObject.mockResolvedValue(Buffer.alloc(bytes.length));
  await expect(
    registerMediaUpload(repo, storage, intent, "actor"),
  ).rejects.toThrow("摘要");
  expect(storage.putValidatedObject).not.toHaveBeenCalled();
});
it("rejects work before GET when validation slots are exhausted", async () => {
  const { tryAcquireMediaValidation } = await import("./image-validation");
  const first = tryAcquireMediaValidation();
  const second = tryAcquireMediaValidation();
  try {
    const { intent, repo, storage } = await setup();
    await expect(
      registerMediaUpload(repo, storage, intent, "actor"),
    ).rejects.toThrow("繁忙");
    expect(storage.readObject).not.toHaveBeenCalled();
  } finally {
    first?.();
    second?.();
  }
});
