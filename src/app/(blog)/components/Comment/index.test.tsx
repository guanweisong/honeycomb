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

vi.mock("@/app/(blog)/components/Comment/CommentClient", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.clientProps = props;
    return <div data-testid="comment-client" />;
  },
}));

import Comment from ".";

describe("Comment", () => {
  it("creates the server query and forwards its promise to CommentClient", async () => {
    const queryPromise = Promise.resolve({ list: [], total: 0 });
    mocks.listByRef.mockReturnValueOnce(queryPromise);

    const result = await Comment({ id: "post-1", type: "POST" as never });

    expect(mocks.listByRef).toHaveBeenCalledWith({ id: "post-1", type: "POST" });
    expect((result as React.ReactElement).props).toMatchObject({
      id: "post-1",
      type: "POST",
      queryCommentPromise: queryPromise,
    });
  });

  it("preserves the requested reference type", async () => {
    const queryPromise = Promise.resolve({ list: [], total: 0 });
    mocks.listByRef.mockReturnValueOnce(queryPromise);

    const result = await Comment({ id: "page-1", type: "PAGE" as never });

    expect(mocks.listByRef).toHaveBeenCalledWith({ id: "page-1", type: "PAGE" });
    expect((result as React.ReactElement<Record<string, unknown>>).props.type).toBe(
      "PAGE",
    );
  });
});
