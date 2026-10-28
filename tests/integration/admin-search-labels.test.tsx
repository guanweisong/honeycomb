import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";

const query = vi.hoisted(() => vi.fn());

vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => false,
}));
vi.mock("@/lib/trpc/client/trpc", () => {
  const mutation = { useMutation: () => ({ mutateAsync: vi.fn() }) };
  const listQuery = { useQuery: query };
  return {
    trpc: {
      useUtils: () => ({
        post: {
          adminDetail: { prefetch: vi.fn() },
          adminIndex: { invalidate: vi.fn() },
        },
      }),
      post: { adminIndex: listQuery, destroy: mutation },
      user: {
        index: listQuery,
        create: mutation,
        update: mutation,
        destroy: mutation,
      },
      link: {
        adminIndex: listQuery,
        create: mutation,
        update: mutation,
        destroy: mutation,
      },
      comment: { index: listQuery, update: mutation, destroy: mutation },
      tag: {
        index: listQuery,
        create: mutation,
        update: mutation,
        destroy: mutation,
      },
    },
  };
});

import PostListClient from "@/features/post/admin/list/components/PostListClient";
import { UserPageShell } from "@/features/user/admin/components/UserPageShell";
import { LinkPageShell } from "@/features/link/admin/components/LinkPageShell";
import { CommentPageShell } from "@/features/comment/admin/components/CommentPageShell";
import Tag from "@/features/tag/admin/page";

beforeEach(() => {
  query.mockReset().mockReturnValue({
    data: { list: [], total: 0 },
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
});
afterEach(cleanup);

it.each([
  {
    Page: PostListClient,
    label: "搜索文章",
    placeholder: "请输入文章名称进行搜索",
    field: "title",
  },
  {
    Page: UserPageShell,
    label: "搜索用户",
    placeholder: "请输入用户名进行搜索",
    field: "name",
  },
  {
    Page: LinkPageShell,
    label: "搜索链接",
    placeholder: "请输入链接名称进行搜索",
    field: "name",
  },
  {
    Page: CommentPageShell,
    label: "搜索评论",
    placeholder: "请输入评论内容进行搜索",
    field: "content",
  },
  {
    Page: Tag,
    label: "搜索标签",
    placeholder: "请输入标签名进行搜索",
    field: "name",
  },
])(
  "$label keeps a visually hidden accessible name, placeholder and working query button",
  async ({ Page, label, placeholder, field }) => {
    render(<Page />);
    const input = screen.getByRole("textbox", { name: label });
    const labelElement = requireDefined(
      document.getElementById(input.getAttribute("aria-labelledby") ?? ""),
    );
    expect(labelElement.classList.contains("sr-only")).toBe(true);
    expect(labelElement.getAttribute("aria-hidden")).not.toBe("true");
    expect(labelElement.getAttribute("for")).toBe(input.id);
    expect(input.getAttribute("placeholder")).toBe(placeholder);

    for (const value of ["honeycomb", "new search", ""]) {
      await act(async () => {
        fireEvent.change(input, { target: { value } });
        fireEvent.click(screen.getByRole("button", { name: "查询" }));
      });
      const queryInput = requireDefined(query.mock.lastCall)[0];
      expect(queryInput[field]).toBe(value || undefined);
      expect(screen.getByRole("textbox", { name: label })).toBe(input);
    }
  },
);
