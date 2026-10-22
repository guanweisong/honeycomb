// @vitest-environment node

import { describe, expect, it } from "vitest";
import { CommentStatus } from "@/features/comment/types/comment.status";
import { InvalidStateTransitionError } from "@/lib/errors/domain-error";
import { assertCommentTransition } from "./comment-moderation";

const allowed = new Set([
  "TO_AUDIT:PUBLISH",
  "TO_AUDIT:RUBBISH",
  "TO_AUDIT:BAN",
  "PUBLISH:RUBBISH",
  "PUBLISH:BAN",
  "RUBBISH:PUBLISH",
  "BAN:PUBLISH",
]);

describe("comment moderation rules", () => {
  for (const from of Object.values(CommentStatus)) {
    for (const to of Object.values(CommentStatus)) {
      it(`${from} → ${to} preserves the moderation policy`, () => {
        const validate = () => assertCommentTransition("comment-1", from, to);
        if (allowed.has(`${from}:${to}`)) expect(validate).not.toThrow();
        else expect(validate).toThrow(InvalidStateTransitionError);
      });
    }
  }

  it.each(["", " ", "\t\n"])(
    "rejects blank identity %j before transition validation",
    (id) => {
      expect(() =>
        assertCommentTransition(id, CommentStatus.RUBBISH, CommentStatus.BAN),
      ).toThrow("聚合标识不能为空");
    },
  );
});
