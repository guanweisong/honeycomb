import { describe, expect, it, vi } from "vitest";
import { updateSetting } from "./setting-use-cases";

describe("Setting command use cases", () => {
  it("更新成功后刷新全部公开内容，并传播缓存失败", async () => {
    const cacheError = new Error("cache failed");
    const update = vi.fn().mockResolvedValue({ id: "setting-1" });
    const invalidator = {
      invalidateAll: vi.fn().mockRejectedValue(cacheError),
    };

    await expect(
      updateSetting({ update }, { id: "setting-1" }, invalidator),
    ).rejects.toBe(cacheError);
    expect(update).toHaveBeenCalledBefore(invalidator.invalidateAll);
  });
});
