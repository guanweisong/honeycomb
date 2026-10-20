import type { CommentTargetRepository } from "./comment-target-repository";
import type { CommentQueryRepository } from "./comment-query-repository";
import "server-only";
import type { CommentRefInput } from "../types";
import {
  assertPublicTarget,
  toCommentTargetReferenceFromRef,
} from "./comment-target-policy";
export type { CommentRefInput } from "../types";
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
