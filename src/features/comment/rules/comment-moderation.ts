import { CommentStatus } from "@/features/comment/types/comment.status";
import { assertNonBlankId } from "@/lib/validation/nonblank-id";
import { InvalidStateTransitionError } from "@/lib/errors/domain-error";

const transitions: Record<CommentStatus, readonly CommentStatus[]> = {
  [CommentStatus.TO_AUDIT]: [
    CommentStatus.PUBLISH,
    CommentStatus.RUBBISH,
    CommentStatus.BAN,
  ],
  [CommentStatus.PUBLISH]: [CommentStatus.RUBBISH, CommentStatus.BAN],
  [CommentStatus.RUBBISH]: [CommentStatus.PUBLISH],
  [CommentStatus.BAN]: [CommentStatus.PUBLISH],
};

export function assertCommentTransition(
  id: string,
  current: CommentStatus,
  next: CommentStatus,
): void {
  assertNonBlankId(id);
  if (!transitions[current].includes(next)) {
    throw new InvalidStateTransitionError(
      `评论不能从 ${current} 变更为 ${next}`,
    );
  }
}
