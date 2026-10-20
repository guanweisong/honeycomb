import { describe, expect, it, vi } from "vitest";
import { submitMediaUpload } from "./media-actions";
const media = {
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
    beginUpload: vi.fn(async ({ name }: { name: string }) => ({
      id: name,
      uploadUrl: `https://temp.test/${name}`,
      expiresAt: "later",
    })),
    uploadToStorage: vi.fn().mockResolvedValue(undefined),
    confirmUpload: vi.fn(async ({ id }: { id: string }) =>
      id === "bad.png"
        ? { state: "rejected" as const, id, message: "invalid image" }
        : { state: "ready" as const, media },
    ),
  };
}
describe("settled lifecycle uploads", () => {
  it("retains successful siblings without any browser cleanup", async () => {
    const d = deps();
    const result = await submitMediaUpload({
      ...d,
      files: [file(), file("bad.png")],
    });
    expect(result).toMatchObject({
      state: "partial",
      media: [media],
      failed: [{ id: "bad.png", name: "bad.png", outcome: "failed" }],
    });
  });
  it.each(["put", "confirm"])(
    "retains operation ID after uncertain %s and never replays",
    async (stage) => {
      const d = deps();
      d[
        stage === "put" ? "uploadToStorage" : "confirmUpload"
      ].mockRejectedValue(new Error("lost response"));
      const result = await submitMediaUpload({ ...d, files: [file()] });
      expect(result).toMatchObject({
        state: "error",
        failed: [{ id: "good.png", outcome: "indeterminate" }],
      });
      expect(d.beginUpload).toHaveBeenCalledTimes(1);
      if (stage === "put") expect(d.confirmUpload).not.toHaveBeenCalled();
    },
  );
  it("exposes pending operations without selectable media", async () => {
    const d = deps();
    d.confirmUpload.mockResolvedValue({
      state: "pending",
      id: "good.png",
      message: "check again",
    } as never);
    expect(await submitMediaUpload({ ...d, files: [file()] })).toMatchObject({
      state: "error",
      failed: [
        { id: "good.png", outcome: "indeterminate", message: "check again" },
      ],
    });
  });
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
    expect(d.beginUpload).not.toHaveBeenCalled();
  });
});
