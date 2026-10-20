import { vi } from "vitest";
import type * as schema from "@/lib/db/schema";
import type { MediaPersistence } from "@/features/media/server/media-repository";
import type { MediaStorage } from "@/features/media/server";
export function mediaRow(
  overrides: Partial<typeof schema.media.$inferSelect> = {},
): typeof schema.media.$inferSelect {
  return {
    id: "111111111111111111111111",
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
    state: "UPLOADING",
    verifiedAt: null,
    lastAttemptAt: null,
    lastErrorCode: null,
    uploadedBy: "actor",
    uploadExpiresAt: "2030-01-01T00:00:00Z",
    copyStartedAt: null,
    ...overrides,
  };
}
export function mediaRepositoryFixture(row = mediaRow()) {
  return {
    begin: vi.fn<MediaPersistence["begin"]>().mockResolvedValue(row),
    findForUpload: vi
      .fn<MediaPersistence["findForUpload"]>()
      .mockResolvedValue(row),
    claimCopy: vi.fn<MediaPersistence["claimCopy"]>().mockResolvedValue(row),
    bindReady: vi.fn<MediaPersistence["bindReady"]>().mockResolvedValue(row),
    note: vi.fn<MediaPersistence["note"]>().mockResolvedValue(undefined),
    beginDelete: vi
      .fn<MediaPersistence["beginDelete"]>()
      .mockResolvedValue([row]),
    finishDelete: vi
      .fn<MediaPersistence["finishDelete"]>()
      .mockResolvedValue(undefined),
  };
}
export function mediaStorageFixture() {
  return {
    getPresignedUrl: vi
      .fn<MediaStorage["getPresignedUrl"]>()
      .mockResolvedValue("https://upload.test/temp"),
    headObject: vi.fn<MediaStorage["headObject"]>().mockResolvedValue(null),
    copyCandidate: vi
      .fn<MediaStorage["copyCandidate"]>()
      .mockResolvedValue(undefined),
    readObject: vi.fn<MediaStorage["readObject"]>(),
    deleteObjects: vi
      .fn<MediaStorage["deleteObjects"]>()
      .mockResolvedValue(undefined),
  };
}
