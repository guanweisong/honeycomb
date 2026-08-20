import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
import type { PostCommandRepository } from "./infrastructure/post-command-repository";
import type { PostCommandInput } from "./repository";
import { publishPost, withdrawPost } from "./post-command-handlers";
export * from "./post-commands";
export * from "./post-queries";
export * from "./post-detail-queries";
export * from "./post-special-queries";
export * from "./post-filters";
export { publishPost, withdrawPost } from "./post-command-handlers";

/** Post 轻量 DDD service：聚合行为由 domain 承载，service 负责用例编排。 */
export const postService = {
  publish(repository: PostCommandRepository, input: PostCommandInput & { id: string; status?: string }, bus?: InProcessEventBus) {
    return publishPost(repository, input, bus);
  },
  withdraw(repository: PostCommandRepository, input: PostCommandInput & { id: string; status?: string }, bus?: InProcessEventBus) {
    return withdrawPost(repository, input, bus);
  },
};
