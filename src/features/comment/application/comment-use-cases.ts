import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
import type { CommentStatus } from "@/packages/domain/content/comment";
import type { CommentCommandRepository, CommentUpdate } from "./repository";
import { moderateComment } from "./comment-command-handlers";

export * from "./comment-commands";
export * from "./comment-queries";
export * from "./comment-public-queries";
export * from "../comment-target";
export * from "../comment-dto";
export { moderateComment } from "./comment-command-handlers";
export { notifyCommentCreated } from "../notifications/comment-delivery";

/** Comment 用例入口；审核状态由 Comment 聚合负责。 */
export const commentUseCases = {
  moderate(
    repository: CommentCommandRepository,
    input: CommentUpdate & {
      currentStatus: CommentStatus;
      status: CommentStatus;
    },
    bus?: InProcessEventBus,
  ) {
    return moderateComment(repository, input, bus);
  },
};
