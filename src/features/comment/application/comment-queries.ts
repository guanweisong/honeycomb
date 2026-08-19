import "server-only";
import type { CommentListInput, CommentQueryRepository } from "../infrastructure/comment-query-repository";
export type { CommentListInput } from "../infrastructure/comment-query-repository";
/** 查询后台评论列表。 */
export function listComments(repository: CommentQueryRepository, input: CommentListInput) { return repository.list(input); }
