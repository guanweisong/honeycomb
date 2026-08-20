import { describe, expect, it, vi } from "vitest";
import { aggregateId } from "../core/aggregate";
import { InProcessEventBus } from "./event-bus";

describe("InProcessEventBus", () => {
  it("派发事件并支持取消订阅", async () => {
    const bus = new InProcessEventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe("post.published", handler);
    const event = { name: "post.published", aggregateId: aggregateId("post-1"), occurredAt: new Date(), payload: {} };
    await bus.publish(event);
    unsubscribe();
    await bus.publish(event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("传播处理器失败", async () => {
    const bus = new InProcessEventBus();
    bus.subscribe("post.published", async () => { throw new Error("handler failed"); });
    await expect(bus.publish({ name: "post.published", aggregateId: aggregateId("post-1"), occurredAt: new Date(), payload: {} })).rejects.toThrow("handler failed");
  });
});
