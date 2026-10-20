import { describe, expect, it, vi } from "vitest";
import { submitMediaDelete, submitMediaUpload } from "./media-actions";
import type { MediaRecord } from "../types";
export const uploadedMedia = {
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
export function dependencies() {
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
        : { state: "ready" as const, media: uploadedMedia },
    ),
  };
}
export const file = (name = "good.png") =>
  new File(["a"], name, { type: "image/png" });
describe("media lifecycle actions", () => {
  it("begins temporary upload and confirms only the operation ID", async () => {
    const deps = dependencies();
    expect(await submitMediaUpload({ ...deps, files: [file()] })).toEqual({
      state: "success",
      media: [uploadedMedia],
    });
    expect(deps.beginUpload).toHaveBeenCalledWith({
      name: "good.png",
      type: "image/png",
      size: 1,
    });
    expect(deps.confirmUpload).toHaveBeenCalledWith({ id: "good.png" });
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
  it("preserves conflict details and pending deletion", async () => {
    expect(
      await submitMediaDelete({
        id: "ready",
        destroy: vi.fn().mockRejectedValue(
          Object.assign(new Error("仍被内容引用"), {
            data: { code: "CONFLICT" },
          }),
        ),
      }),
    ).toEqual({ state: "error", message: "仍被内容引用" });
    expect(
      await submitMediaDelete({
        id: "ready",
        destroy: vi.fn().mockResolvedValue({
          success: false,
          state: "indeterminate",
          message: "pending",
        }),
      }),
    ).toEqual({ state: "indeterminate", message: "pending" });
  });
});
it("treats lost delete responses as indeterminate instead of safe-to-select failures", async () => {
  expect(
    await submitMediaDelete({
      id: "ready",
      destroy: vi.fn().mockRejectedValue(new Error("network lost")),
    }),
  ).toMatchObject({ state: "indeterminate" });
});
it("does not confirm an upload after its account or component is obsolete", async () => {
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
  expect(deps.confirmUpload).not.toHaveBeenCalled();
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
