import { describe, expect, it, vi } from "vitest";
import { defineUseCase } from "./use-case";

describe("应用用例契约", () => {
  it("通过 execute 暴露统一调用入口", async () => {
    const handler = vi.fn(async (input: { id: string }) => input.id);
    const useCase = defineUseCase(handler);

    await expect(useCase.execute({ id: "post-1" })).resolves.toBe("post-1");
    expect(handler).toHaveBeenCalledWith({ id: "post-1" });
  });
});
