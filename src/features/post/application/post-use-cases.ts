import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
import type { PostCommandRepository, PostCommandInput } from "./repository";
import { publishPost, withdrawPost } from "./post-command-handlers";

export * from "./post-commands";
export * from "./post-queries";
export * from "./post-detail-queries";
export * from "./post-special-queries";
export * from "../post-filters";
export { publishPost, withdrawPost } from "./post-command-handlers";

/** Post 用例入口；领域不变量由 Post 聚合负责。 */
export const postUseCases = {
  publish(
    repository: PostCommandRepository,
    input: PostCommandInput & { id: string; status?: string },
    bus?: InProcessEventBus,
  ) {
    return publishPost(repository, input, bus);
  },
  withdraw(
    repository: PostCommandRepository,
    input: PostCommandInput & { id: string; status?: string },
    bus?: InProcessEventBus,
  ) {
    return withdrawPost(repository, input, bus);
  },
};
