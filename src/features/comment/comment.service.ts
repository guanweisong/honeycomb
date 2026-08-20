/* eslint-disable @typescript-eslint/no-explicit-any -- 状态值由 Comment 聚合校验。 */
import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
import type { CommentCommandRepository, CommentUpdate } from "./repository";
import { moderateComment } from "./comment-command-handlers";
export * from "./comment-commands";
export * from "./comment-queries";
export * from "./comment-public-queries";
export * from "./comment-target";
export * from "./comment-dto";
export { moderateComment } from "./comment-command-handlers";
export { notifyCommentCreated } from "./notifications/comment-delivery";

/** Comment 轻量 DDD service：审核状态由 Comment 聚合负责。 */
export const commentService = {
  moderate(repository: CommentCommandRepository, input: CommentUpdate & { currentStatus: any; status: any }, bus?: InProcessEventBus) {
    return moderateComment(repository, input, bus);
  },
};
