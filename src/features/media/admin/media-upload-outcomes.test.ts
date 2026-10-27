import { describe, expect, it, vi } from "vitest";
import { submitMediaUpload } from "@/features/media/admin/media-actions";
import { File as NodeFile } from "node:buffer";
import { webcrypto } from "node:crypto";
import { beforeEach } from "vitest";
import type { MediaRecord } from "@/features/media/types/media.record";
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("File", NodeFile);
});
const media: MediaRecord = {
  id: "ready",
  name: "good.png",
  type: "image/png",
  size: 1,
  key: "final/good",
  url: "https://cdn.test/good",
  width: null,
  height: null,
  color: null,
  createdAt: null,
  updatedAt: null,
};
const file = (name = "good.png") =>
  new File(["a"], name, { type: "image/png" });
function deps() {
  return {
    prepareUpload: vi.fn(async ({ name }: { name: string }) => ({
      intent: name,
      uploadUrl: `https://temp.test/${name}`,
      expiresAt: "later",
    })),
    uploadToStorage: vi.fn().mockResolvedValue(undefined),
    registerUpload: vi.fn(async ({ intent }: { intent: string }) => {
      if (intent === "bad.png") throw new Error("invalid image");
      return media;
    }),
  };
}
describe("settled registration uploads", () => {
  it("retains successful siblings without any browser cleanup", async () => {
    const d = deps();
    const result = await submitMediaUpload({
      ...d,
      files: [file(), file("bad.png")],
    });
    expect(result).toMatchObject({
      state: "partial",
      media: [media],
      failed: [
        { name: "bad.png", message: expect.stringContaining("invalid image") },
      ],
    });
  });
  it.each(["put", "confirm"])(
    "retains truthful errors after failed %s and never replays",
    async (stage) => {
      const d = deps();
      d[
        stage === "put" ? "uploadToStorage" : "registerUpload"
      ].mockRejectedValue(new Error("lost response"));
      const result = await submitMediaUpload({ ...d, files: [file()] });
      expect(result).toMatchObject({
        state: "error",
        failed: [
          {
            name: "good.png",
            message: expect.stringContaining("lost response"),
          },
        ],
      });
      expect(d.prepareUpload).toHaveBeenCalledTimes(1);
      if (stage === "put") expect(d.registerUpload).not.toHaveBeenCalled();
    },
  );
  it("validates batch and file policy before creating an operation", async () => {
    const d = deps();
    expect(
      (
        await submitMediaUpload({
          ...d,
          files: Array.from({ length: 21 }, () => file()),
        })
      ).state,
    ).toBe("error");
    expect(
      (
        await submitMediaUpload({
          ...d,
          files: [new File(["x"], "x.svg", { type: "image/svg+xml" })],
        })
      ).state,
    ).toBe("error");
    expect(d.prepareUpload).not.toHaveBeenCalled();
  });
});
