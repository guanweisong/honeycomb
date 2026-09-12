import { describe, expect, it, vi } from "vitest";

import type { MediaViewModel } from "../media-view-model";
import { submitMediaDelete, submitMediaUpload } from "./media-actions";

const uploadedMedia = {
  id: "media-1",
  name: "cover.png",
  type: "image/png",
  size: 3,
  key: "media/cover.png",
  url: "https://cdn.example.test/cover.png",
  width: 20,
  height: 10,
  color: "rgb(1,2,3)",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: null,
} as MediaViewModel;

describe("media action state", () => {
  it("uploads image metadata through the existing presigned URL flow", async () => {
    const file = new File(["png"], "cover.png", { type: "image/png" });
    const getImageMetadata = vi.fn().mockResolvedValue({
      width: 20,
      height: 10,
      color: "rgb(1,2,3)",
    });
    const getPresignedUrl = vi.fn().mockResolvedValue({
      url: "https://upload.example.test/cover.png",
      key: "media/cover.png",
    });
    const uploadToStorage = vi.fn().mockResolvedValue(undefined);
    const createMedia = vi
      .fn()
      .mockResolvedValue({ state: "created", media: uploadedMedia });

    await expect(
      submitMediaUpload({
        files: [file],
        getImageMetadata,
        getPresignedUrl,
        uploadToStorage,
        createMedia,
        cleanupObject: vi.fn(),
      }),
    ).resolves.toEqual({ state: "success", media: [uploadedMedia] });
    expect(getPresignedUrl).toHaveBeenCalledWith({
      name: "cover.png",
      type: "image/png",
      size: 3,
    });
    expect(uploadToStorage).toHaveBeenCalledWith(
      "https://upload.example.test/cover.png",
      file,
    );
    expect(createMedia).toHaveBeenCalledWith({
      name: "cover.png",
      type: "image/png",
      size: 3,
      key: "media/cover.png",
      width: 20,
      height: 10,
      color: "rgb(1,2,3)",
    });
  });

  it("keeps upload and delete failure states separate from successful refreshes", async () => {
    await expect(
      submitMediaUpload({
        files: [],
        getImageMetadata: vi.fn(),
        getPresignedUrl: vi.fn(),
        uploadToStorage: vi.fn(),
        createMedia: vi.fn(),
        cleanupObject: vi.fn(),
      }),
    ).resolves.toEqual({ state: "empty" });

    await expect(
      submitMediaDelete({
        id: "media-1",
        destroy: vi.fn().mockResolvedValue({
          success: false,
          state: "indeterminate",
          message: "删除结果待确认，请刷新媒体列表后重试",
        }),
      }),
    ).resolves.toEqual({
      state: "indeterminate",
      message: "删除结果待确认，请刷新媒体列表后重试",
    });

    await expect(
      submitMediaUpload({
        files: [new File(["image"], "image.png", { type: "image/png" })],
        getImageMetadata: vi.fn().mockResolvedValue({ width: 1, height: 1 }),
        getPresignedUrl: vi.fn().mockRejectedValue(new Error("sign failed")),
        uploadToStorage: vi.fn(),
        createMedia: vi.fn(),
        cleanupObject: vi.fn(),
      }),
    ).resolves.toMatchObject({
      state: "error",
      message: "image.png: sign failed",
    });

    await expect(
      submitMediaDelete({
        id: "media-1",
        destroy: vi.fn().mockResolvedValue({ success: true }),
      }),
    ).resolves.toEqual({ state: "success" });

    await expect(
      submitMediaDelete({
        id: "media-1",
        destroy: vi.fn().mockRejectedValue(new Error("delete failed")),
      }),
    ).resolves.toEqual({ state: "error" });
  });
});
