import "server-only";
import type { CommentRefInput, CommentQueryRepository } from "./repository";
export type { CommentRefInput } from "./repository";
/** 查询公开评论并构建评论树。 */
export function listPublicCommentsByRef(repository: CommentQueryRepository, input: CommentRefInput) { return repository.listPublicByRef(input); }
