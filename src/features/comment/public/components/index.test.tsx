import React from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listByRef: vi.fn(),
  clientProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@/packages/trpc/api", () => ({
  createServerClient: vi.fn(async () => ({
    comment: { listByRef: mocks.listByRef },
  })),
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
  it("creates the server query and forwards its promise to CommentClient", async () => {
    const queryPromise = Promise.resolve({ list: [], total: 0 });
    mocks.listByRef.mockReturnValueOnce(queryPromise);

    const result = await Comment({ id: "post-1", type: MenuType.CATEGORY });

    expect(mocks.listByRef).toHaveBeenCalledWith({
      id: "post-1",
      type: MenuType.CATEGORY,
    });
    expect((result as React.ReactElement).props).toMatchObject({
      id: "post-1",
      type: MenuType.CATEGORY,
      queryCommentPromise: queryPromise,
    });
  });

  it("preserves the requested reference type", async () => {
    const queryPromise = Promise.resolve({ list: [], total: 0 });
    mocks.listByRef.mockReturnValueOnce(queryPromise);

    const result = await Comment({ id: "page-1", type: MenuType.PAGE });

    expect(mocks.listByRef).toHaveBeenCalledWith({
      id: "page-1",
      type: "PAGE",
    });
    expect(
      (result as React.ReactElement<Record<string, unknown>>).props.type,
    ).toBe("PAGE");
  });
});
