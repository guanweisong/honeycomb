import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { PostStatus } from "@/features/post/types/post.status";
import {
  createPostEditorTestFixture,
  type PostEditorTestDetail as EditorDetail,
} from "@tests/helpers/post-editor-test-helpers";

const mocks = vi.hoisted(() => ({
  userId: "draft-user",
  create: vi.fn(),
  update: vi.fn(),
  refetch: vi.fn(),
  creationResult: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  detail: undefined as EditorDetail | undefined,
  queryError: null as { data?: { code: string } } | null,
}));

vi.mock("@/features/user/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: mocks.userId, level: "ADMIN" } }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error, warning: mocks.warning },
}));
vi.mock("@/lib/observability/client", () => ({
  clientLogger: { warn: mocks.warn },
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({
      post: { adminIndex: { invalidate: async () => {} } },
      page: { adminIndex: { invalidate: async () => {} } },
    }),
    category: { adminTree: { useQuery: () => ({ data: [] }) } },
    post: {
      creationResult: {
        useQuery: () => ({ data: null, refetch: mocks.creationResult }),
      },
      adminDetail: {
        useQuery: () => ({
          data: mocks.detail,
          refetch: mocks.refetch,
          error: mocks.queryError,
        }),
      },
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
    },
  },
}));

import { usePostEditor } from "@/features/post/admin/edit/hooks/use-post-editor";

describe("usePostEditor hydration and saved-value reconciliation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: ReturnType<typeof usePostEditor> | undefined;
  const { postId, cover, tag, originalDetail } = createPostEditorTestFixture();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.userId = "draft-user";
    mocks.detail = undefined;
    mocks.queryError = null;
    mocks.creationResult.mockResolvedValue({ isSuccess: true, data: null });
    mocks.create.mockResolvedValue({ id: postId, version: 1 });
    mocks.update.mockResolvedValue({ id: postId, version: 1 });
    mocks.refetch.mockResolvedValue({});
    editor = undefined;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  function Harness({ id }: { id: string | null }) {
    editor = usePostEditor(id);
    return <span>{editor.loading ? "saving" : "idle"}</span>;
  }

  async function rerenderEditor(id: string | null = null) {
    await act(async () => root.render(<Harness id={id} />));
  }

  async function renderEditor(id: string | null = null) {
    await rerenderEditor(id);
    await act(async () => {
      requireDefined(editor).form.setValue("categoryId", "category-1");
      requireDefined(editor).form.setValue("coverId", "cover-1");
    });
  }

  it("preserves dirty fields and cover/tag selections during a same-post refetch", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    const selectedCover = { ...cover, id: "cover-2", url: "/selected.jpg" };
    const selectedTag = { ...tag, id: "222222222222222222222222" };

    await act(async () => {
      const current = requireDefined(editor);
      current.form.setValue(
        "title",
        { zh: "未保存标题" },
        { shouldDirty: true },
      );
      current.form.setValue("coverId", selectedCover.id, { shouldDirty: true });
      current.setCoverPreview(selectedCover);
      current.form.setValue("galleryStyles", [selectedTag], {
        shouldDirty: true,
      });
      current.form.setValue("movieActors", [selectedTag], {
        shouldDirty: true,
      });
      current.form.setValue("movieDirectors", [selectedTag], {
        shouldDirty: true,
      });
      current.form.setValue("movieStyles", [selectedTag], {
        shouldDirty: true,
      });
    });
    mocks.detail = { ...originalDetail, title: { zh: "后台更新标题" } };
    await rerenderEditor(postId);

    const current = requireDefined(editor);
    expect(current.form.getValues("title")).toEqual({ zh: "未保存标题" });
    expect(current.form.getValues("coverId")).toBe(selectedCover.id);
    expect(current.form.formState.isDirty).toBe(true);
    expect(current.photoPickerProps.cover).toEqual(selectedCover);
    expect(current.form.getValues("galleryStyles")).toEqual([
      expect.objectContaining({ id: selectedTag.id, name: selectedTag.name }),
    ]);
    expect(current.form.getValues("movieActors")).toEqual([
      expect.objectContaining({ id: selectedTag.id, name: selectedTag.name }),
    ]);
    expect(current.form.getValues("movieDirectors")).toEqual([
      expect.objectContaining({ id: selectedTag.id, name: selectedTag.name }),
    ]);
    expect(current.form.getValues("movieStyles")).toEqual([
      expect.objectContaining({ id: selectedTag.id, name: selectedTag.name }),
    ]);
  });

  it("refreshes a pristine form and its auxiliary selections", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    const refreshed = {
      ...originalDetail,
      title: { zh: "最新标题" },
      coverId: "cover-2",
      cover: { ...cover, id: "cover-2" },
      galleryStyles: [],
      movieActors: [],
      movieDirectors: [],
      movieStyles: [],
    };
    mocks.detail = refreshed;
    await rerenderEditor(postId);

    const current = requireDefined(editor);
    expect(current.form.getValues("title")).toEqual(refreshed.title);
    expect(current.photoPickerProps.cover).toEqual(refreshed.cover);
    expect(current.form.getValues("galleryStyles")).toEqual([]);
    expect(current.form.getValues("movieActors")).toEqual([]);
    expect(current.form.getValues("movieDirectors")).toEqual([]);
    expect(current.form.getValues("movieStyles")).toEqual([]);
    expect(current.form.formState.isDirty).toBe(false);
  });

  it.each([null, "234567890123456789012345"])(
    "clears the previous draft when navigating to %s and initializes arriving detail",
    async (nextId) => {
      mocks.detail = originalDetail;
      await renderEditor(postId);
      await act(async () => {
        requireDefined(editor).form.setValue(
          "title",
          { zh: "未保存标题" },
          { shouldDirty: true },
        );
      });
      // The prior query may still be visible while the next record is loading.
      await rerenderEditor(nextId);

      const current = requireDefined(editor);
      expect(current.form.getValues()).toEqual({
        type: "ARTICLE",
        galleryStyles: [],
        movieActors: [],
        movieDirectors: [],
        movieStyles: [],
      });
      expect(current.form.formState.isDirty).toBe(false);
      expect(current.photoPickerProps.cover).toBeUndefined();
      expect(current.form.getValues("galleryStyles")).toEqual([]);
      expect(current.form.getValues("movieActors")).toEqual([]);
      expect(current.form.getValues("movieDirectors")).toEqual([]);
      expect(current.form.getValues("movieStyles")).toEqual([]);

      if (nextId) {
        mocks.detail = {
          ...originalDetail,
          id: nextId,
          title: { zh: "新文章" },
        };
        await rerenderEditor(nextId);
        expect(requireDefined(editor).form.getValues("id")).toBe(nextId);
        expect(requireDefined(editor).form.getValues("title")).toEqual({
          zh: "新文章",
        });
        expect(requireDefined(editor).photoPickerProps.cover).toEqual(cover);
        expect(requireDefined(editor).form.getValues("galleryStyles")).toEqual([
          tag,
        ]);
      }
    },
  );

  it("replaces a dirty draft immediately when navigating to a loaded record", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    await act(async () => {
      requireDefined(editor).form.setValue(
        "title",
        { zh: "未保存标题" },
        { shouldDirty: true },
      );
    });
    const nextId = "234567890123456789012345";
    mocks.detail = { ...originalDetail, id: nextId, title: { zh: "新文章" } };
    await rerenderEditor(nextId);

    expect(requireDefined(editor).form.getValues("id")).toBe(nextId);
    expect(requireDefined(editor).form.getValues("title")).toEqual({
      zh: "新文章",
    });
    expect(requireDefined(editor).form.formState.isDirty).toBe(false);
  });

  it("resets the saved draft and auxiliary selections from the explicit save refetch", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    await act(async () => {
      const current = requireDefined(editor);
      current.form.setValue(
        "title",
        { zh: "未保存标题" },
        { shouldDirty: true },
      );
      current.setCoverPreview(undefined);
      current.form.setValue("galleryStyles", [], { shouldDirty: true });
      current.form.setValue("movieActors", [], { shouldDirty: true });
      current.form.setValue("movieDirectors", [], { shouldDirty: true });
      current.form.setValue("movieStyles", [], { shouldDirty: true });
    });
    const savedDetail = {
      ...originalDetail,
      version: 1,
      title: { zh: "已保存标题" },
      status: PostStatus.PUBLISHED,
    };
    mocks.refetch.mockResolvedValue({ data: savedDetail, isSuccess: true });
    await act(async () => {
      await expect(
        requireDefined(editor).submit(PostStatus.PUBLISHED, "update"),
      ).resolves.toBe(true);
    });

    const current = requireDefined(editor);
    expect(current.form.getValues("title")).toEqual(savedDetail.title);
    expect(current.form.getValues("status")).toBe(PostStatus.PUBLISHED);
    expect(current.form.formState.isDirty).toBe(false);
    expect(current.photoPickerProps.cover).toEqual(cover);
    expect(current.form.getValues("galleryStyles")).toEqual([tag]);
    expect(current.form.getValues("movieActors")).toEqual([tag]);
    expect(current.form.getValues("movieDirectors")).toEqual([tag]);
    expect(current.form.getValues("movieStyles")).toEqual([tag]);
  });

  it("keeps the saved values when refetch fails with an older cached detail", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    const selectedCover = { ...cover, id: "cover-2", url: "/selected.jpg" };
    const selectedTag = { ...tag, id: "222222222222222222222222" };
    await act(async () => {
      const current = requireDefined(editor);
      current.form.setValue("title", { zh: "保存标题" }, { shouldDirty: true });
      current.form.setValue("coverId", selectedCover.id, { shouldDirty: true });
      current.setCoverPreview(selectedCover);
      current.form.setValue("galleryStyles", [selectedTag], {
        shouldDirty: true,
      });
      current.form.setValue("movieActors", [selectedTag], {
        shouldDirty: true,
      });
      current.form.setValue("movieDirectors", [selectedTag], {
        shouldDirty: true,
      });
      current.form.setValue("movieStyles", [selectedTag], {
        shouldDirty: true,
      });
    });
    mocks.refetch.mockResolvedValue({
      data: originalDetail,
      isError: true,
      isSuccess: false,
    });

    await act(async () => {
      await expect(
        requireDefined(editor).submit(PostStatus.PUBLISHED, "update"),
      ).resolves.toBe(true);
    });

    const current = requireDefined(editor);
    expect(current.form.getValues("title")).toEqual({ zh: "保存标题" });
    expect(current.form.getValues("coverId")).toBe(selectedCover.id);
    expect(current.form.getValues("status")).toBe(PostStatus.PUBLISHED);
    expect(current.form.formState.isDirty).toBe(false);
    expect(current.photoPickerProps.cover).toEqual(selectedCover);
    expect(current.form.getValues("galleryStyles")).toEqual([
      expect.objectContaining({ id: selectedTag.id, name: selectedTag.name }),
    ]);
    expect(current.form.getValues("movieActors")).toEqual([
      expect.objectContaining({ id: selectedTag.id, name: selectedTag.name }),
    ]);
    expect(current.form.getValues("movieDirectors")).toEqual([
      expect.objectContaining({ id: selectedTag.id, name: selectedTag.name }),
    ]);
    expect(current.form.getValues("movieStyles")).toEqual([
      expect.objectContaining({ id: selectedTag.id, name: selectedTag.name }),
    ]);
  });
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
