import { describe, expect, it } from "vitest";
import { CommentStatus } from "@/packages/domain/content/comment";
import { TEST_IDS } from "@tests/helpers/test-constants";
import { CommentUpdateSchema } from "./comment.update.schema";

describe("CommentUpdateSchema", () => {
  it("拒绝没有任何可编辑字段的更新", () => {
    expect(CommentUpdateSchema.safeParse({ id: TEST_IDS.ID_1 }).success).toBe(
      false,
    );
  });

  it("只允许后台编辑字段而拒绝公开提交字段", () => {
    expect(
      CommentUpdateSchema.safeParse({
        id: TEST_IDS.ID_1,
        postId: TEST_IDS.ID_2,
      }).success,
    ).toBe(false);
    expect(
      CommentUpdateSchema.safeParse({
        id: TEST_IDS.ID_1,
        parentId: TEST_IDS.ID_2,
      }).success,
    ).toBe(false);
    expect(
      CommentUpdateSchema.safeParse({
        id: TEST_IDS.ID_1,
        captchaToken: "captcha",
      }).success,
    ).toBe(false);
  });

  it("允许仅审核状态的更新", () => {
    expect(
      CommentUpdateSchema.safeParse({
        id: TEST_IDS.ID_1,
        status: CommentStatus.BAN,
      }).success,
    ).toBe(true);
  });
});
