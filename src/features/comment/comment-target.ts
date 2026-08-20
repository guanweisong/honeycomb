import "server-only";
import type { CommentTarget, CommentTargetRepository } from "./repository";
export type { CommentTarget } from "./repository";
export { CommentTargetError } from "./infrastructure/comment-target-repository";
/** 校验公开评论目标是否存在且允许评论。 */
export function assertPublicCommentTarget(repository: CommentTargetRepository, target: CommentTarget) { return repository.assertPublic(target); }
/** 校验回复评论与当前评论是否属于同一目标。 */
export function assertCommentParentMatches(repository: CommentTargetRepository, parentId: string, target: CommentTarget) { return repository.assertParent(parentId, target); }
