import {
  DomainError,
  InvalidStateTransitionError,
} from "@/lib/errors/domain-error";
import { assertNonBlankId } from "@/lib/validation/nonblank-id";

/** Validate an edit after the command has decoded the persisted status. */
export function assertPublicationStatusChange(
  id: string,
  current: string,
  next: string | undefined,
  statuses: { PUBLISHED: string; DRAFT: string },
  content: "post" | "page",
): void {
  if (next === undefined || next === current) return;
  const noun = content === "post" ? "文章" : "页面";
  if (next !== statuses.PUBLISHED && next !== statuses.DRAFT) {
    throw new DomainError(
      `${noun}不支持变更为 ${next}`,
      `INVALID_${content.toUpperCase()}_STATUS`,
    );
  }
  assertNonBlankId(id);
  if (next === statuses.DRAFT && current !== statuses.PUBLISHED) {
    throw new InvalidStateTransitionError(`只有已发布${noun}可以撤回`);
  }
}
