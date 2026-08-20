import type { InProcessEventBus } from "./event-bus";
import type { DomainEvent } from "../core/aggregate";

export interface CoreEventSideEffects {
  invalidatePostCache?: (event: DomainEvent) => void | Promise<void>;
  notifyCommentModerated?: (event: DomainEvent) => void | Promise<void>;
  notifyUserStatusChanged?: (event: DomainEvent) => void | Promise<void>;
}

/** 注册核心领域事件的副作用处理器；具体缓存、通知和邮件实现由入口注入。 */
export function registerCoreEventHandlers(bus: InProcessEventBus, effects: CoreEventSideEffects): () => void {
  const unsubscribers = [
    effects.invalidatePostCache && bus.subscribe("post.published", effects.invalidatePostCache),
    effects.invalidatePostCache && bus.subscribe("post.withdrawn", effects.invalidatePostCache),
    effects.notifyCommentModerated && bus.subscribe("comment.moderated", effects.notifyCommentModerated),
    effects.notifyUserStatusChanged && bus.subscribe("user.status-changed", effects.notifyUserStatusChanged),
  ].filter((unsubscribe): unsubscribe is () => void => Boolean(unsubscribe));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
