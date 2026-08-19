import "server-only";
import type { CommentRefInput, CommentQueryRepository } from "../infrastructure/comment-query-repository";
export type { CommentRefInput } from "../infrastructure/comment-query-repository";
/** 查询公开评论并构建评论树。 */
export function listPublicCommentsByRef(repository: CommentQueryRepository, input: CommentRefInput) { return repository.listPublicByRef(input); }
