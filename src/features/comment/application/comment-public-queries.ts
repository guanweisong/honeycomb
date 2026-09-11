import "server-only";
import type {
  CommentRefInput,
  CommentQueryRepository,
  CommentTargetRepository,
} from "./repository";
import {
  assertPublicTarget,
  toCommentTargetReferenceFromRef,
} from "./comment-target-policy";
export type { CommentRefInput } from "./repository";
/** 查询公开评论并构建评论树。 */
export async function listPublicCommentsByRef(
  repository: CommentQueryRepository,
  targetRepository: CommentTargetRepository,
  input: CommentRefInput,
) {
  await assertPublicTarget(
    targetRepository,
    toCommentTargetReferenceFromRef(input),
  );
  return repository.listPublicByRef(input);
}
