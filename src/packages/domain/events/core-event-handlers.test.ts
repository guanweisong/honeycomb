import { describe, expect, it, vi } from "vitest";
import { aggregateId } from "../core/aggregate";
import { InProcessEventBus } from "./event-bus";
import { registerCoreEventHandlers } from "./core-event-handlers";

describe("core event handlers", () => {
  it("将缓存和通知副作用注册到领域事件", async () => {
    const bus = new InProcessEventBus();
    const cache = vi.fn();
    const comment = vi.fn();
    const stop = registerCoreEventHandlers(bus, { invalidatePostCache: cache, notifyCommentModerated: comment });
    const base = { aggregateId: aggregateId("aggregate-1"), occurredAt: new Date(), payload: {} };
    await bus.publish({ ...base, name: "post.published" });
    await bus.publish({ ...base, name: "comment.moderated" });
    stop();
    expect(cache).toHaveBeenCalledOnce();
    expect(comment).toHaveBeenCalledOnce();
  });
});
