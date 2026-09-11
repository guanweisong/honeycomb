import { describe, expect, it, vi } from "vitest";
import { submitMediaUpload } from "./media-actions";
import type { MediaViewModel } from "../media-view-model";
import { createMedia as createMediaUseCase } from "../../application/media-use-cases";
import type { MediaEntity } from "../../application/write-schema";

const successfulMedia = {
  id: "media-1",
  name: "good.png",
  type: "image/png",
  size: 1,
  key: "good.png",
  url: "https://example.test/good.png",
  width: null,
  height: null,
  color: null,
  createdAt: null,
  updatedAt: null,
} satisfies MediaViewModel;
function dependencies() {
  return {
    getImageMetadata: vi.fn().mockResolvedValue({ width: 1, height: 1 }),
    getPresignedUrl: vi.fn(async ({ name }: { name: string }) => ({
      key: name,
      url: `https://storage.test/${name}`,
      cleanupUrl: `https://storage.test/delete/${name}`,
    })),
    uploadToStorage: vi.fn().mockResolvedValue(undefined),
    createMedia: vi.fn(async ({ name }: MediaEntity) => {
      if (name === "bad.png")
        return { state: "rejected" as const, message: "metadata failed" };
      return { state: "created" as const, media: successfulMedia };
    }),
    cleanupObject: vi.fn().mockResolvedValue(undefined),
  };
}
describe("settled media uploads", () => {
  it("keeps an object when metadata committed but the response was lost", async () => {
    const deps = dependencies();
    const committed: MediaViewModel[] = [];
    deps.createMedia.mockImplementation(async (input) => {
      await createMediaUseCase(
        {
          create: async () => {
            committed.push(successfulMedia);
            return successfulMedia;
          },
        },
        input,
      );
      throw new Error("response lost");
    });
    const result = await submitMediaUpload({
      ...deps,
      files: [new File(["a"], "good.png", { type: "image/png" })],
    });
    expect(result.state).toBe("error");
    expect("failed" in result && result.failed).toEqual([
      expect.objectContaining({
        name: "good.png",
        outcome: "indeterminate",
        cleanupFailed: false,
      }),
    ]);
    expect(deps.cleanupObject).not.toHaveBeenCalled();
    expect(committed).toEqual([successfulMedia]);
  });
  it("retains successful siblings and cleans an object whose metadata failed", async () => {
    const deps = dependencies();
    const result = await submitMediaUpload({
      ...deps,
      files: [
        new File(["a"], "good.png", { type: "image/png" }),
        new File(["b"], "bad.png", { type: "image/png" }),
      ],
    });
    expect(result.state).toBe("partial");
    expect("media" in result && result.media).toEqual([successfulMedia]);
    expect("failed" in result && result.failed).toEqual([
      {
        name: "bad.png",
        message: "metadata failed",
        cleanupFailed: false,
        outcome: "failed",
      },
    ]);
    expect(deps.cleanupObject).toHaveBeenCalledWith("bad.png");
  });
  it("reports cleanup failure without losing the successful sibling", async () => {
    const deps = dependencies();
    deps.cleanupObject.mockRejectedValue(new Error("cleanup unavailable"));
    const result = await submitMediaUpload({
      ...deps,
      files: [
        new File(["a"], "good.png", { type: "image/png" }),
        new File(["b"], "bad.png", { type: "image/png" }),
      ],
    });
    expect(result.state).toBe("partial");
    expect("media" in result && result.media).toEqual([successfulMedia]);
    expect("failed" in result && result.failed).toEqual([
      {
        name: "bad.png",
        message: "metadata failed",
        cleanupFailed: true,
        outcome: "failed",
      },
    ]);
  });
  it("does not clean objects whose PUT never succeeded", async () => {
    const deps = dependencies();
    deps.uploadToStorage.mockRejectedValue(new Error("PUT failed"));
    expect(
      (
        await submitMediaUpload({
          ...deps,
          files: [new File(["a"], "good.png", { type: "image/png" })],
        })
      ).state,
    ).toBe("error");
    expect(deps.cleanupObject).not.toHaveBeenCalled();
  });
  it("rejects batches exceeding 20 before any side effect", async () => {
    const deps = dependencies();
    const result = await submitMediaUpload({
      ...deps,
      files: Array.from(
        { length: 21 },
        () => new File(["a"], "good.png", { type: "image/png" }),
      ),
    });
    expect(result.state).toBe("error");
    expect(deps.getPresignedUrl).not.toHaveBeenCalled();
  });
  it("rejects unsupported or oversized files without presigning", async () => {
    const deps = dependencies();
    const file = new File(["svg"], "bad.svg", { type: "image/svg+xml" });
    expect((await submitMediaUpload({ ...deps, files: [file] })).state).toBe(
      "error",
    );
    expect(deps.getPresignedUrl).not.toHaveBeenCalled();
  });
});
