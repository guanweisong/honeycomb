import type { PostCommandRepository, PostUpdateCommand } from "./repository";
import type { PostStatus } from "@/packages/domain/content/post-status";
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
    input: PostUpdateCommand & { status: PostStatus },
  ) {
    return publishPost(repository, input);
  },
  withdraw(
    repository: PostCommandRepository,
    input: PostUpdateCommand & { status: PostStatus },
  ) {
    return withdrawPost(repository, input);
  },
};
