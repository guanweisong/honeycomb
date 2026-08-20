import { describe, expect, it, vi } from "vitest";
import { aggregateId } from "../core/aggregate";
import { handleIdempotently } from "./reliable-handler";

const event = { name: "post.published", aggregateId: aggregateId("post-1"), occurredAt: new Date(), payload: {} };

describe("reliable event handler", () => {
  it("失败后重试并成功", async () => {
    const handler = vi.fn().mockRejectedValueOnce(new Error("temporary")).mockResolvedValue(undefined);
    await handleIdempotently(event, handler, new Set());
    expect(handler).toHaveBeenCalledTimes(2);
  });
  it("成功后幂等跳过", async () => {
    const handler = vi.fn();
    const state = new Set<string>();
    await handleIdempotently(event, handler, state);
    await handleIdempotently(event, handler, state);
    expect(handler).toHaveBeenCalledOnce();
  });
  it("达到重试上限后记录失败", async () => {
    const failure = vi.fn();
    await expect(handleIdempotently(event, vi.fn().mockRejectedValue(new Error("failed")), new Set(), failure, 2)).rejects.toThrow("failed");
    expect(failure).toHaveBeenCalledWith(expect.objectContaining({ attempts: 2 }));
  });
});
