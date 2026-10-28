import React, { act } from "react";
import { within } from "@testing-library/dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageWithRelations } from "@/features/page/types/page.read-model";
import type { TagRecord } from "@/features/tag/types/tag.record";
import type { PostWithRelations } from "@/features/post/types/post.read-model";
import { PageTemplate } from "@/features/page/types/page.template";
import { PageStatus } from "@/features/page/types/page.status";
import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";
import { EnableStatus } from "@/lib/validation/enable-status";
import { Permission } from "@/lib/auth/permissions";
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span>{alt}</span>,
}));
const mocks = vi.hoisted(() => ({ destroy: vi.fn(), refetch: vi.fn() }));
const tag: TagRecord = {
  id: "tag-1",
  name: { zh: "标签", en: "Tag" },
  createdAt: null,
  updatedAt: null,
};
const page: PageWithRelations = {
  id: "507f1f77bcf86cd799439011",
  version: 3,
  authorId: "author-1",
  title: { zh: "页面", en: "Page" },
  content: null,
  status: PageStatus.DRAFT,
  template: PageTemplate.DEFAULT,
  views: 0,
  author: null,
  imagesInContent: [],
  createdAt: null,
  updatedAt: null,
};
const post: PostWithRelations = {
  id: "post-1",
  version: 3,
  authorId: "author-1",
  categoryId: "category-1",
  title: { zh: "文章" },
  content: null,
  excerpt: null,
  status: PostStatus.DRAFT,
  type: PostType.ARTICLE,
  commentStatus: EnableStatus.ENABLE,
  coverId: null,
  quoteAuthor: null,
  quoteContent: null,
  movieTime: null,
  galleryLocation: null,
  galleryTime: null,
  views: 0,
  createdAt: null,
  updatedAt: null,
  movieActors: [],
  movieDirectors: [],
  movieStyles: [],
  galleryStyles: [],
};
const query = <Record,>(record: Record) => ({
  useQuery: () => ({
    data: { list: [record], total: 1 },
    refetch: mocks.refetch,
    isFetching: false,
    isError: false,
  }),
});
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: (permission: Permission) =>
    new Set<Permission>([
      Permission.pageDelete,
      Permission.postDelete,
      Permission.tagDelete,
    ]).has(permission),
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({
      post: {
        adminDetail: { prefetch: vi.fn().mockResolvedValue(undefined) },
        adminIndex: { invalidate: vi.fn().mockResolvedValue(undefined) },
      },
      page: {
        adminDetail: { prefetch: vi.fn().mockResolvedValue(undefined) },
        adminIndex: { invalidate: vi.fn().mockResolvedValue(undefined) },
      },
    }),
    page: {
      adminIndex: { useQuery: () => query(page).useQuery() },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
    post: {
      adminIndex: { useQuery: () => query(post).useQuery() },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
    tag: {
      index: { useQuery: () => query(tag).useQuery() },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
      create: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      update: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    },
  },
}));
import Page from "@/features/page/admin/list/page";
import Tag from "@/features/tag/admin/page";
import PostListClient from "@/features/post/admin/list/components/PostListClient";

describe.each([
  {
    name: "page",
    Component: Page,
    id: "507f1f77bcf86cd799439011",
    deleteLabel: "删除页面",
  },
  { name: "tag", Component: Tag, id: "tag-1", deleteLabel: "删除标签" },
  {
    name: "post",
    Component: PostListClient,
    id: "post-1",
    deleteLabel: "删除文章",
  },
])("$name actual delete consumer", ({ name, Component, id, deleteLabel }) => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    mocks.destroy
      .mockReset()
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValueOnce({ success: true, publicSync: "degraded" });
    mocks.refetch.mockReset().mockRejectedValue(new Error("refresh failed"));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  it.each(["batch", "single"])(
    "retains %s confirmation and selected IDs on failure, closes after committed retry",
    async (mode) => {
      await act(async () => root.render(<Component />));
      await act(async () =>
        within(container)
          .getByRole("checkbox", { name: `选择记录 ${id}` })
          .click(),
      );
      const batch = within(container).getByRole<HTMLButtonElement>("button", {
        name: "批量删除",
      });
      const trigger =
        mode === "batch"
          ? batch
          : within(container).getByRole("button", { name: deleteLabel });
      await act(async () => trigger.click());
      const confirm = () =>
        within(within(document.body).getByRole("dialog")).getByRole("button", {
          name: "确定",
        });
      await act(async () => confirm().click());
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
      expect(batch.disabled).toBe(false);
      await act(async () => confirm().click());
      const input =
        name === "post" || name === "page"
          ? { items: [{ id, expectedVersion: 3 }] }
          : { ids: [id] };
      expect(mocks.destroy.mock.calls).toEqual([[input], [input]]);
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
      if (mode === "batch") expect(batch.disabled).toBe(true);
    },
  );
});
