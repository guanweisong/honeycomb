import { expect, it, vi } from "vitest";
import { createMedia } from "./media-use-cases";
import { MediaCreateRejectedError } from "./upload-result";

const input = {
  name: "image.png",
  type: "image/png" as const,
  size: 1,
  key: "image.png",
};
it("returns definite repository rejection as a received result permitting cleanup", async () => {
  await expect(
    createMedia(
      {
        create: vi
          .fn()
          .mockRejectedValue(
            new MediaCreateRejectedError("constraint rejected"),
          ),
      },
      input,
    ),
  ).resolves.toEqual({ state: "rejected", message: "媒体信息未保存" });
});
it("does not claim an ambiguous database failure is a definite rejection", async () => {
  await expect(
    createMedia(
      {
        create: vi.fn().mockRejectedValue(new Error("database response lost")),
      },
      input,
    ),
  ).resolves.toEqual({
    state: "indeterminate",
    message: "保存结果待确认，请刷新媒体列表后核对",
  });
});
