import type { CommentListItem } from "@/features/comment/types/comment.read-model";
import { CommentStatus } from "@/features/comment/types/comment.status";
import { requireDefined } from "@tests/helpers/require-defined";
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

import { Permission } from "@/lib/auth/permissions";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

let allowedPermissions = new Set<Permission>();
const comment: CommentListItem = {
  id: "comment-1",
  content: "需要审核的评论",
  postId: "post-1",
  author: "评论者",
  email: "commenter@example.com",
  site: null,
  ip: "127.0.0.1",
  status: CommentStatus.TO_AUDIT,
  parentId: null,
  pageId: null,
  customId: null,
  userAgent: null,
  post: null,
  page: null,
  custom: null,
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: "2026-01-02T03:04:05.000Z",
};
const trpcMocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("@/app/admin/(dashboard)/providers/use-current-user", () => ({
  useCan: (permission: Permission) => allowedPermissions.has(permission),
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
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

import { CommentPageShell } from "@/app/admin/(dashboard)/comment/components/CommentPageShell/index";

describe("CommentPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    comment.status = CommentStatus.TO_AUDIT;
    allowedPermissions = new Set();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it.each(["batch", "single"])(
    "retains the real %s delete dialog and selection after failure, then closes after committed retry",
    async (mode) => {
      allowedPermissions = new Set([Permission.commentModerate]);
      trpcMocks.mutateAsync
        .mockReset()
        .mockRejectedValueOnce(new Error("write failed"))
        .mockResolvedValueOnce({ success: true, publicSync: "degraded" });
      trpcMocks.refetch
        .mockReset()
        .mockRejectedValue(new Error("refresh failed"));
      await act(async () => root.render(<CommentPageShell />));
      await act(async () =>
        requireDefined(
          container.querySelectorAll<HTMLElement>('[role="checkbox"]')[1],
        ).click(),
      );
      const batch = requireDefined(
        Array.from(container.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("批量删除"),
        ),
      );
      const trigger =
        mode === "batch"
          ? batch
          : requireDefined(
              Array.from(
                container.querySelectorAll<HTMLButtonElement>(
                  'tbody button[aria-label="删除评论"]',
                ),
              ).at(0),
            );
      await act(async () => trigger.click());
      const confirm = () =>
        requireDefined(
          Array.from(document.body.querySelectorAll("button")).find(
            (button) => button.textContent === "确定",
          ),
        );
      await act(async () => confirm().click());
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
      expect(batch.disabled).toBe(false);
      await act(async () => confirm().click());
      expect(trpcMocks.mutateAsync.mock.calls).toEqual([
        [{ ids: ["comment-1"] }],
        [{ ids: ["comment-1"] }],
      ]);
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
      if (mode === "batch") expect(batch.disabled).toBe(true);
    },
  );

  it.each([
    { status: CommentStatus.TO_AUDIT, labels: ["通过", "驳回", ""] },
    { status: CommentStatus.PUBLISH, labels: ["屏蔽", ""] },
    { status: CommentStatus.RUBBISH, labels: ["通过", ""] },
    { status: CommentStatus.BAN, labels: ["解除屏蔽", ""] },
    { status: null, labels: [""] },
  ])(
    "keeps the complete $status action order with deletion last",
    async ({ status, labels }) => {
      comment.status = status;
      allowedPermissions = new Set([Permission.commentModerate]);
      await act(async () => root.render(<CommentPageShell />));
      expect(
        Array.from(
          container.querySelectorAll('tbody button:not([role="checkbox"])'),
          (button) => button.textContent,
        ),
      ).toEqual(labels);
      expect(
        container.querySelector(
          'tbody button:last-child[aria-label="删除评论"]',
        ),
      ).not.toBeNull();
    },
  );

  it.each([
    {
      status: CommentStatus.TO_AUDIT,
      button: "通过",
      next: CommentStatus.PUBLISH,
    },
    {
      status: CommentStatus.TO_AUDIT,
      button: "驳回",
      next: CommentStatus.RUBBISH,
    },
    { status: CommentStatus.PUBLISH, button: "屏蔽", next: CommentStatus.BAN },
    {
      status: CommentStatus.RUBBISH,
      button: "通过",
      next: CommentStatus.PUBLISH,
    },
    {
      status: CommentStatus.BAN,
      button: "解除屏蔽",
      next: CommentStatus.PUBLISH,
    },
  ])(
    "retains $status → $next confirmation after failure and closes after committed retry",
    async ({ status, button, next }) => {
      comment.status = status;
      allowedPermissions = new Set([Permission.commentModerate]);
      trpcMocks.mutateAsync
        .mockReset()
        .mockRejectedValueOnce(new Error("write failed"))
        .mockResolvedValueOnce({ publicSync: "degraded" });
      trpcMocks.refetch
        .mockReset()
        .mockRejectedValue(new Error("refresh failed"));
      await act(async () => root.render(<CommentPageShell />));
      await act(async () =>
        requireDefined(
          Array.from(container.querySelectorAll("button")).find(
            (item) => item.textContent === button,
          ),
        ).click(),
      );
      expect(
        document.body.querySelector('[role="dialog"]')?.textContent,
      ).toContain(`确定要${button}吗？`);
      const confirm = () =>
        requireDefined(
          Array.from(document.body.querySelectorAll("button")).find(
            (item) => item.textContent === "确定",
          ),
        );
      await act(async () => confirm().click());
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
      await act(async () => confirm().click());
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
      expect(trpcMocks.mutateAsync.mock.calls).toEqual([
        [{ id: comment.id, status: next }],
        [{ id: comment.id, status: next }],
      ]);
    },
  );

  it("names row actions and associates the search label", async () => {
    allowedPermissions = new Set([Permission.commentModerate]);
    await act(async () => root.render(<CommentPageShell />));
    for (const name of ["删除评论"]) {
      const button = container.querySelector(
        `tbody button[aria-label="${name}"]`,
      );
      expect(button).not.toBeNull();
      expect(button?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
        "true",
      );
    }
    const input = container.querySelector<HTMLInputElement>(
      'input[placeholder="请输入评论内容进行搜索"]',
    );
    const label = document.getElementById(
      input?.getAttribute("aria-labelledby") ?? "",
    );
    expect(label?.textContent).toBe("搜索评论");
    if (input) input.value = "test";
    expect(label?.textContent).toBe("搜索评论");
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

  it("hides private comment columns and their sorting without private-read capability", async () => {
    await act(async () => root.render(React.createElement(CommentPageShell)));

    expect(container.textContent).not.toContain("评论人邮箱");
    expect(container.textContent).not.toContain("评论IP");
    expect(container.textContent).not.toContain("commenter@example.com");
    expect(container.textContent).not.toContain("127.0.0.1");
    expect(container.textContent).toContain("评论文章");
    const targetHeader = Array.from(container.querySelectorAll("th")).find(
      (header) => header.textContent?.includes("评论文章"),
    );
    expect(targetHeader).toBeDefined();
    expect(targetHeader?.querySelector("button")).toBeNull();
  });

  it("keeps private comment columns for authorized readers without moderation", async () => {
    allowedPermissions = new Set([Permission.commentReadPrivate]);
    await act(async () => root.render(React.createElement(CommentPageShell)));

    expect(container.textContent).toContain("评论人邮箱");
    expect(container.textContent).toContain("评论IP");
    expect(container.textContent).toContain("commenter@example.com");
    expect(container.textContent).toContain("127.0.0.1");
    expect(container.textContent).not.toContain("批量删除");
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

    const checkboxes =
      container.querySelectorAll<HTMLElement>('[role="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    await act(async () => requireDefined(checkboxes[1]).click());
    expect((batchButton as HTMLButtonElement).disabled).toBe(false);
  });
});
