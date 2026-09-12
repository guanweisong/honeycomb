import { describe, expect, it, vi } from "vitest";
import { updateSetting } from "./setting-use-cases";

describe("Setting command use cases", () => {
  it("更新已提交后缓存降级仍返回持久化结果", async () => {
    const saved = { id: "setting-1" };
    const update = vi.fn().mockResolvedValue(saved);
    const invalidator = {
      invalidate: vi.fn().mockResolvedValue({ state: "degraded" as const }),
    };

    await expect(
      updateSetting({ update }, { id: "setting-1" }, invalidator),
    ).resolves.toEqual(saved);
    expect(update).toHaveBeenCalledBefore(invalidator.invalidate);
    expect(invalidator.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
    });
  });
});
