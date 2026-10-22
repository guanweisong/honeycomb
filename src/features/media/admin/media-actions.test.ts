import { File as NodeFile } from "node:buffer";
import { webcrypto } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitMediaDelete, submitMediaUpload } from "./media-actions";
import type { MediaRecord } from "@/features/media/types/media.record";
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("File", NodeFile);
});
const uploadedMedia = {
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
} satisfies MediaRecord;
function dependencies() {
  return {
    prepareUpload: vi.fn(async ({ name }: { name: string }) => ({
      intent: name,
      uploadUrl: `https://temp.test/${name}`,
      expiresAt: "later",
    })),
    uploadToStorage: vi.fn().mockResolvedValue(undefined),
    registerUpload: vi.fn(async ({ intent }: { intent: string }) => {
      if (intent === "bad.png") throw new Error("invalid image");
      return uploadedMedia;
    }),
  };
}
const file = (name = "good.png") =>
  new File(["a"], name, { type: "image/png" });
describe("media registration actions", () => {
  it("hashes actual bytes and registers only the signed intent", async () => {
    const deps = dependencies();
    expect(await submitMediaUpload({ ...deps, files: [file()] })).toEqual({
      state: "success",
      media: [uploadedMedia],
    });
    expect(deps.prepareUpload).toHaveBeenCalledWith({
      name: "good.png",
      type: "image/png",
      size: 1,
      sha256:
        "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
    });
    expect(deps.registerUpload).toHaveBeenCalledWith({ intent: "good.png" });
  });
  it("requires explicit unknown-reference acknowledgment for deletion", async () => {
    const destroy = vi.fn().mockResolvedValue({ success: true });
    expect(await submitMediaDelete({ id: "ready", destroy })).toEqual({
      state: "success",
    });
    expect(destroy).toHaveBeenCalledWith({
      ids: ["ready"],
      acknowledgeUnknownReferences: true,
    });
  });
  it.each(["completed", "degraded"] as const)(
    "preserves committed public synchronization outcome: %s",
    async (publicSync) => {
      const destroy = vi.fn().mockResolvedValue({ success: true, publicSync });
      expect(await submitMediaDelete({ id: "ready", destroy })).toEqual({
        state: "success",
        publicSync,
      });
      expect(destroy).toHaveBeenCalledOnce();
    },
  );
  it("preserves deletion errors with manual verification guidance", async () => {
    expect(
      await submitMediaDelete({
        id: "ready",
        destroy: vi.fn().mockRejectedValue(new Error("network lost")),
      }),
    ).toEqual({
      state: "error",
      message: "network lost；删除结果可能未完成，请人工核对后再重试",
    });
  });
});
it("does not register an upload after its account or component is obsolete", async () => {
  const deps = dependencies();
  let active = true;
  deps.uploadToStorage.mockImplementation(async () => {
    active = false;
  });
  await submitMediaUpload({
    ...deps,
    files: [file()],
    isCurrent: () => active,
  });
  expect(deps.registerUpload).not.toHaveBeenCalled();
});
it("limits a batch to two concurrent uploads", async () => {
  const deps = dependencies();
  let active = 0;
  let peak = 0;
  deps.uploadToStorage.mockImplementation(async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 0));
    active--;
  });
  const result = await submitMediaUpload({
    ...deps,
    files: Array.from({ length: 5 }, (_, i) => file(`${i}.png`)),
  });
  expect(result.state).toBe("success");
  expect(peak).toBe(2);
});
