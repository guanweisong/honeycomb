import React from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clientProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock("./CommentClient", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.clientProps = props;
    return <div data-testid="comment-client" />;
  },
}));

import Comment from ".";
import { MenuType } from "@/packages/domain/navigation/menu";

describe("Comment", () => {
  it("forwards the shared query promise to CommentClient", () => {
    const queryPromise = Promise.resolve({ list: [], total: 0 });

    const result = Comment({
      id: "post-1",
      type: MenuType.CATEGORY,
      queryCommentPromise: queryPromise,
    });

    expect((result as React.ReactElement).props).toMatchObject({
      id: "post-1",
      type: MenuType.CATEGORY,
      queryCommentPromise: queryPromise,
    });
  });

  it("preserves the requested reference type", () => {
    const queryPromise = Promise.resolve({ list: [], total: 0 });

    const result = Comment({
      id: "page-1",
      type: MenuType.PAGE,
      queryCommentPromise: queryPromise,
    });

    expect(
      (result as React.ReactElement<Record<string, unknown>>).props.type,
    ).toBe("PAGE");
  });
});
