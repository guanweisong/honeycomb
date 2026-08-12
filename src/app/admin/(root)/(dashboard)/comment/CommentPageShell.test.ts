import React, { act } from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createRoot, type Root } from "react-dom/client";

import { Permission } from "@/packages/identity/auth/permissions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

let allowedPermissions = new Set<Permission>();
const comment = {
  id: "comment-1",
  content: "需要审核的评论",
  postId: "post-1",
  author: "评论者",
  email: "commenter@example.com",
  site: null,
  ip: "127.0.0.1",
  status: "TO_AUDIT",
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: "2026-01-02T03:04:05.000Z",
};
const trpcMocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("@/app/admin/hooks/useCurrentUser", () => ({
  useCan: (permission: Permission) => allowedPermissions.has(permission),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    comment: {
      index: {
        useQuery: () => ({
          data: { list: [comment], total: 1 },
          isFetching: false,
          isError: false,
          refetch: trpcMocks.refetch,
        }),
      },
      update: { useMutation: () => ({ mutateAsync: trpcMocks.mutateAsync }) },
      destroy: { useMutation: () => ({ mutateAsync: trpcMocks.mutateAsync }) },
    },
  },
}));

import { CommentPageShell } from "./CommentPageShell";

describe("CommentPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    allowedPermissions = new Set();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps comment search available while hiding moderation controls", async () => {
    await act(async () => root.render(React.createElement(CommentPageShell)));

    expect(container.textContent).toContain("查询");
    expect(
      container.querySelector('input[placeholder="请输入评论内容进行搜索"]'),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("批量删除");
    expect(container.textContent).not.toContain("通过");
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(0);
  });

  it("uses the moderation capability for selection and batch deletion", async () => {
    allowedPermissions = new Set([Permission.commentModerate]);
    await act(async () => root.render(React.createElement(CommentPageShell)));

    const batchButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("批量删除"),
    );
    expect(batchButton).toBeDefined();
    expect((batchButton as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain("通过");
    expect(container.textContent).toContain("驳回");

    const checkboxes = container.querySelectorAll<HTMLElement>(
      '[role="checkbox"]',
    );
    expect(checkboxes).toHaveLength(2);
    await act(async () => checkboxes[1].click());
    expect((batchButton as HTMLButtonElement).disabled).toBe(false);
  });
});
