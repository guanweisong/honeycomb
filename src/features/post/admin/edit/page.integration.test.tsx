import { createAdminListCache } from "@tests/helpers/admin-list-cache";
import { writePostCreationAttempt } from "@/features/post/admin/edit/utils/post-draft";
import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useFormContext } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";
import { EnableStatus } from "@/lib/validation/enable-status";
import type { PostDetailResult } from "@/features/post/types/post.read-model";
import type { PostUpdate } from "@/features/post/types/post.update";
import type { PostEditorValues } from "@/features/post/admin/edit/utils/post-draft";

const state = vi.hoisted(() => ({
  id: "123456789012345678901234",
  userId: "editor-a",
  creationCheck: vi.fn(),
  push: vi.fn(),
  create: vi.fn(),
  detail: undefined as PostDetailResult | undefined,
  update:
    vi.fn<(input: PostUpdate) => Promise<{ id: string; version: number }>>(),
  refetch:
    vi.fn<() => Promise<{ isSuccess: boolean; data?: PostDetailResult }>>(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ id: state.id }),
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: state.userId, level: "ADMIN" } }),
  useCan: () => true,
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => cache.utils,
    category: { adminTree: { useQuery: () => ({ data: [] }) } },
    post: {
      adminDetail: {
        useQuery: () => ({ data: state.detail, refetch: state.refetch }),
      },
      creationResult: {
        useQuery: () => ({ data: null, refetch: state.creationCheck }),
      },
      create: { useMutation: () => ({ mutateAsync: state.create }) },
      update: { useMutation: () => ({ mutateAsync: state.update }) },
    },
  },
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock("@/features/post/admin/edit/components/PostTypeFields", () => ({
  PostTypeFields: () => {
    const form = useFormContext<PostEditorValues>();
    return (
      <>
        <button
          type="button"
          onClick={() =>
            form.setValue(
              "quoteContent",
              { zh: "Local after withdrawal" },
              { shouldDirty: true },
            )
          }
        >
          Edit quote
        </button>
        <button
          type="button"
          onClick={() =>
            form.setValue("status", PostStatus.DRAFT, { shouldDirty: true })
          }
        >
          Unsaved status
        </button>
      </>
    );
  },
}));
vi.mock("@/features/post/admin/edit/components/PostSidebarFields", () => ({
  PostSidebarFields: () => null,
}));
vi.mock("@/features/media/admin/components/PhotoPicker/index", () => ({
  default: () => null,
}));
vi.mock("@/features/media/admin/components/MediaPageShell", () => ({
  MediaPageShell: () => null,
}));
vi.mock("@/features/category/admin/components/CategoryFormDialog", () => ({
  default: () => null,
}));

import PostDetail from "@/features/post/admin/edit/page";
import { AdminLayoutActionsContext } from "@/components/admin/layout-context";

const published: PostDetailResult = {
  id: state.id,
  authorId: "author-a",
  version: 1,
  categoryId: "category-a",
  title: { zh: "Published quote" },
  content: null,
  excerpt: null,
  status: PostStatus.PUBLISHED,
  type: PostType.QUOTE,
  commentStatus: EnableStatus.ENABLE,
  coverId: null,
  quoteAuthor: null,
  quoteContent: { zh: "Quote" },
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
  imagesInContent: [],
};
function LayoutHarness() {
  const [actions, setActions] = useState<React.ReactNode>(null);
  return (
    <AdminLayoutActionsContext.Provider value={{ setActions }}>
      <header>{actions}</header>
      <PostDetail />
    </AdminLayoutActionsContext.Provider>
  );
}

let cache: ReturnType<typeof createAdminListCache>;

describe("post confirmed state in the real layout header", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.clearAllMocks();
    cache = createAdminListCache("post");
    localStorage.clear();
    state.id = published.id;
    state.userId = "editor-a";
    state.detail = published;
    state.update.mockImplementation(async (input) => ({
      id: input.id,
      version: input.expectedVersion + 1,
    }));
    state.refetch.mockRejectedValue(new Error("read unavailable"));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  const render = async () => {
    await act(async () => root.render(<LayoutHarness />));
  };
  const headerButton = (text: string) =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>("header button"),
    ).find((button) => button.textContent === text);
  async function withdraw() {
    await act(async () => requireDefined(headerButton("撤回为草稿")).click());
    await act(async () =>
      requireDefined(
        document.querySelector<HTMLButtonElement>(
          '[role="dialog"] button[data-slot="button"]',
        ),
      ).click(),
    );
    expect(state.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: PostStatus.DRAFT, expectedVersion: 1 }),
    );
  }

  it.each(["stay", "record", "account"])(
    "checks through the real confirmation button after %s without opening or replaying",
    async (change) => {
      state.id = "";
      state.detail = undefined;
      expect(
        writePostCreationAttempt(
          state.userId,
          PostInsertSchema.parse({
            creationToken: crypto.randomUUID(),
            type: PostType.QUOTE,
            categoryId: "category-a",
            quoteContent: { zh: "Quote" },
          }),
        ),
      ).toBe(true);
      const pending = Promise.withResolvers<{
        isSuccess: boolean;
        data: { id: string; version: number };
      }>();
      state.creationCheck.mockReturnValueOnce(pending.promise);
      await render();
      const check = Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "核对上次结果",
      );
      expect(check).toBeDefined();
      await act(async () => check?.click());
      if (change !== "stay") {
        if (change === "account") {
          state.userId = "editor-b";
          cache = createAdminListCache("post");
        }
        state.id = published.id;
        state.detail = published;
        await render();
      }
      await act(async () =>
        pending.resolve({
          isSuccess: true,
          data: { id: published.id, version: 1 },
        }),
      );
      expect(state.push).not.toHaveBeenCalled();
      expect(state.create).not.toHaveBeenCalled();
      if (change === "account")
        expect(await cache.readLists()).toEqual([
          { title: "Old title" },
          { title: "Old title" },
        ]);
      expect(state.creationCheck).toHaveBeenCalledTimes(1);
    },
  );

  it.each([false, true])(
    "keeps withdrawal confirmed after failed refresh and stale detail replacement=%s",
    async (replaceDetail) => {
      await render();
      await withdraw();
      if (replaceDetail) {
        state.detail = { ...published };
        await render();
      }
      // Click the actual primary action, even when the regression leaves 更新 visible.
      const primary = requireDefined(
        headerButton("保存") ?? headerButton("更新"),
      );
      expect(primary.disabled).toBe(false);
      await act(async () => primary.click());
      expect(state.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: PostStatus.DRAFT,
          expectedVersion: 2,
        }),
      );
      expect(headerButton("更新")).toBeUndefined();
      expect(headerButton("发布")).toBeDefined();
    },
  );

  it("rejects an obsolete explicit latest-version read while preserving the local draft", async () => {
    await render();
    await withdraw();
    await act(async () =>
      requireDefined(
        Array.from(container.querySelectorAll("button")).find(
          (button) => button.textContent === "Edit quote",
        ),
      ).click(),
    );
    state.update.mockRejectedValueOnce({ data: { code: "CONFLICT" } });
    await act(async () => requireDefined(headerButton("保存")).click());
    state.refetch.mockResolvedValueOnce({ isSuccess: true, data: published });
    await act(async () =>
      requireDefined(
        Array.from(container.querySelectorAll("button")).find(
          (button) => button.textContent === "保留本地内容并加载最新版本",
        ),
      ).click(),
    );
    expect(
      JSON.parse(
        requireDefined(
          localStorage.getItem(`honeycomb:draft:post:editor-a:${published.id}`),
        ),
      ),
    ).toMatchObject({
      values: {
        quoteContent: { zh: "Local after withdrawal" },
        baseVersion: 2,
      },
    });
    const primary = requireDefined(
      headerButton("保存") ?? headerButton("更新"),
    );
    await act(async () => primary.click());
    expect(state.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: PostStatus.DRAFT,
        expectedVersion: 2,
        quoteContent: { zh: "Local after withdrawal" },
      }),
    );
  });

  it("does not treat an unsaved status field as the committed publishing state", async () => {
    await render();
    await act(async () =>
      requireDefined(
        Array.from(container.querySelectorAll("button")).find(
          (button) => button.textContent === "Unsaved status",
        ),
      ).click(),
    );
    expect(headerButton("更新")).toBeDefined();
    expect(headerButton("保存")).toBeUndefined();
    await act(async () => requireDefined(headerButton("更新")).click());
    expect(state.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: PostStatus.PUBLISHED,
        expectedVersion: 1,
      }),
    );
  });

  it("retains recovered CAS provenance without replacing the confirmed published status", async () => {
    localStorage.setItem(
      `honeycomb:draft:post:editor-a:${published.id}`,
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        values: {
          type: PostType.QUOTE,
          quoteContent: { zh: "Recovered" },
          baseVersion: 0,
        },
      }),
    );
    await render();
    const restore = requireDefined(
      Array.from(container.querySelectorAll("button")).find(
        (button) =>
          button.textContent?.includes("恢复") &&
          !button.textContent?.includes("核对"),
      ),
    );
    await act(async () => restore.click());
    expect(headerButton("更新")).toBeDefined();
    await act(async () => requireDefined(headerButton("更新")).click());
    expect(state.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: PostStatus.PUBLISHED,
        expectedVersion: 0,
        quoteContent: { zh: "Recovered" },
      }),
    );
  });

  it.each(["record", "account"])(
    "ignores a pending withdrawal refresh after %s changes",
    async (change) => {
      let finishRead:
        | ((result: { isSuccess: boolean; data?: PostDetailResult }) => void)
        | undefined;
      state.refetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishRead = resolve;
          }),
      );
      await render();
      await withdraw();
      expect(state.refetch).toHaveBeenCalledOnce();
      if (change === "record") state.id = "234567890123456789012345";
      else state.userId = "editor-b";
      state.detail = { ...published, id: state.id, version: 5 };
      await render();
      await act(async () =>
        requireDefined(finishRead)({
          isSuccess: true,
          data: { ...published, version: 2, status: PostStatus.DRAFT },
        }),
      );
      expect(headerButton("更新")).toBeDefined();
      expect(headerButton("保存")).toBeUndefined();
      await act(async () => requireDefined(headerButton("更新")).click());
      expect(state.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: state.id,
          expectedVersion: 5,
          status: PostStatus.PUBLISHED,
        }),
      );
    },
  );

  it.each(["record", "account"])(
    "clears the prior confirmed withdrawal on %s change",
    async (change) => {
      await render();
      await withdraw();
      if (change === "record") state.id = "234567890123456789012345";
      else state.userId = "editor-b";
      state.detail = { ...published, id: state.id, version: 5 };
      await render();
      expect(headerButton("更新")).toBeDefined();
      await act(async () => requireDefined(headerButton("更新")).click());
      expect(state.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: state.id,
          status: PostStatus.PUBLISHED,
          expectedVersion: 5,
        }),
      );
    },
  );
});

vi.mock(
  "@/features/post/admin/edit/hooks/use-post-creation-result",
  async () => {
    const { trpc } = await import("@/lib/trpc/client/trpc");
    return {
      usePostCreationResult: (
        creationToken: string,
        _actorId: string | undefined,
        enabled: boolean,
      ) =>
        trpc.post.creationResult.useQuery(
          { creationToken },
          { enabled, retry: false },
        ),
    };
  },
);
