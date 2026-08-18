import { describe, expect, it } from "vitest";

import { CommentStatus } from "@/packages/domain/content/comment";
import { StatusBadgeTone } from "@/packages/ui/extended/StatusBadge";
import { getCommentStatusPresentation } from "./comment-columns";

describe("comment column presentation", () => {
  it("renders each stored moderation status with its existing Chinese label and tone", () => {
    expect(getCommentStatusPresentation(CommentStatus.TO_AUDIT)).toEqual([
      { label: "待审核", tone: StatusBadgeTone.AMBER },
    ]);
    expect(getCommentStatusPresentation(CommentStatus.PUBLISH)).toEqual([
      { label: "已发布", tone: StatusBadgeTone.GREEN },
    ]);
    expect(getCommentStatusPresentation(CommentStatus.RUBBISH)).toEqual([
      { label: "垃圾评论", tone: StatusBadgeTone.GRAY },
    ]);
    expect(getCommentStatusPresentation(CommentStatus.BAN)).toEqual([
      { label: "已屏蔽", tone: StatusBadgeTone.RED },
    ]);
  });

  it("keeps an empty status cell as an em dash", () => {
    expect(getCommentStatusPresentation(undefined)).toEqual([]);
  });
});
