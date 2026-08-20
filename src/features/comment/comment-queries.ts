import "server-only";
import type { CommentListInput, CommentQueryRepository } from "./repository";
export type { CommentListInput } from "./repository";
/** 查询后台评论列表。 */
export function listComments(repository: CommentQueryRepository, input: CommentListInput) { return repository.list(input); }
