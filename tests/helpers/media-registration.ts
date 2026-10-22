import { vi } from "vitest";
import type { MediaRecord } from "@/features/media/types/media.record";
import type { MediaPersistence } from "@/features/media/server/media-repository";
import type { MediaStorage } from "@/features/media/types/media.storage";
export function mediaRow(overrides: Partial<MediaRecord> = {}): MediaRecord {
  return {
    id: "111111111111111111111111",
    key: "media/final.png",
    name: "a.png",
    size: 3,
    type: "image/png",
    url: "https://assets.test/media/final.png",
    color: null,
    height: null,
    width: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}
export function mediaRepositoryFixture(row = mediaRow()) {
  return {
    authorizeUpload: vi
      .fn<MediaPersistence["authorizeUpload"]>()
      .mockResolvedValue(undefined),
    findRegistered: vi
      .fn<MediaPersistence["findRegistered"]>()
      .mockResolvedValue(null),
    insertRegistered: vi
      .fn<MediaPersistence["insertRegistered"]>()
      .mockResolvedValue(row),
    deleteWithStorage: vi
      .fn<MediaPersistence["deleteWithStorage"]>()
      .mockImplementation(async (_ids, _actor, remove) => {
        await remove([row]);
      }),
  };
}
export function mediaStorageFixture() {
  return {
    getPresignedUrl: vi
      .fn<MediaStorage["getPresignedUrl"]>()
      .mockResolvedValue("https://upload.test/temp"),
    headObject: vi.fn<MediaStorage["headObject"]>().mockResolvedValue(null),
    putValidatedObject: vi
      .fn<MediaStorage["putValidatedObject"]>()
      .mockResolvedValue(undefined),
    readObject: vi.fn<MediaStorage["readObject"]>(),
    deleteObjects: vi
      .fn<MediaStorage["deleteObjects"]>()
      .mockResolvedValue(undefined),
  };
}
