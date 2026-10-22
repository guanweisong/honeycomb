// @vitest-environment node

import { describe, expect, it } from "vitest";
import { CommentStatusName } from "@/features/comment/types/comment.status-name";
import { commentStatusOptions } from "./options";

describe("comment display options", () => {
  it("preserves comment labels and option order, including the blocked label", () => {
    expect(CommentStatusName).toEqual({
      TO_AUDIT: "待审核",
      PUBLISH: "已发布",
      RUBBISH: "垃圾评论",
      BAN: "已屏蔽",
    });
    expect(commentStatusOptions).toEqual([
      { label: "待审核", value: "TO_AUDIT" },
      { label: "已发布", value: "PUBLISH" },
      { label: "垃圾评论", value: "RUBBISH" },
      { label: "已屏蔽", value: "BAN" },
    ]);
  });
});
