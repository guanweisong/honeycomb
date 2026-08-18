import { describe, expect, it } from "vitest";
import { MenuType } from "@/packages/domain/navigation/menu";
import { buildCommentInput } from "./comment-input";

const identity = {
  author: "Alice",
  email: "alice@example.com",
  site: "https://example.com",
};

describe("buildCommentInput", () => {
  it.each([
    [MenuType.CATEGORY, "postId"],
    [MenuType.PAGE, "pageId"],
    [MenuType.CUSTOM, "customId"],
  ] as const)("maps %s comments to %s", (type, targetKey) => {
    expect(
      buildCommentInput({
        id: "target-id",
        type,
        identity,
        content: "Hello",
        captchaToken: "captcha",
        parentId: "parent-id",
      }),
    ).toEqual({
      ...identity,
      content: "Hello",
      captchaToken: "captcha",
      [targetKey]: "target-id",
      parentId: "parent-id",
    });
  });
});
