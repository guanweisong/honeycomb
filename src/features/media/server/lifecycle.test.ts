// @vitest-environment node
import { expect, it, vi } from "vitest";
import { confirmMediaUpload } from "../server";
import { createMediaRepository } from "./media-repository";
import type { MediaStorage } from "../server";
const row = {
  id: "id",
  key: "media/final.png",
  uploadKey: "temporary/upload.png",
  name: "a.png",
  size: 3,
  type: "image/png",
  url: "https://assets.test/media/final.png",
  color: null,
  height: null,
  width: null,
  createdAt: null,
  updatedAt: null,
  state: "READY" as const,
  verifiedAt: "now",
  lastAttemptAt: null,
  lastErrorCode: null,
  uploadedBy: "actor",
  uploadExpiresAt: null,
  copyStartedAt: null,
};
it("reconfirmation of READY never reads or copies bytes", async () => {
  const repository: Pick<
    ReturnType<typeof createMediaRepository>,
    "findForUpload" | "claimCopy" | "bindReady" | "note"
  > = {
    findForUpload: vi.fn(async () => row),
    claimCopy: vi.fn(),
    bindReady: vi.fn(),
    note: vi.fn(),
  };
  const storage: MediaStorage = {
    getPresignedUrl: vi.fn(),
    headObject: vi.fn(),
    readObject: vi.fn(),
    copyCandidate: vi.fn(),
    deleteObjects: vi.fn(),
  };
  expect(
    (await confirmMediaUpload(repository, storage, "id", "actor")).state,
  ).toBe("ready");
  expect(storage.copyCandidate).not.toHaveBeenCalled();
  expect(storage.headObject).not.toHaveBeenCalled();
});
