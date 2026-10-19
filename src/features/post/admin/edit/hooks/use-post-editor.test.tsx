import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";
import type { PostDetailResult as PostDetailViewModel } from "@/features/post/application/repository";

type EditorDetail = Pick<
  PostDetailViewModel,
  "id" | "categoryId" | "coverId" | "type"
> &
  Partial<PostDetailViewModel>;

const mocks = vi.hoisted(() => ({
  userId: "draft-user",
  create: vi.fn(),
  update: vi.fn(),
  refetch: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  detail: undefined as EditorDetail | undefined,
  queryError: null as { data?: { code: string } } | null,
}));

vi.mock("@/packages/ui/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: mocks.userId, level: "ADMIN" } }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error, warning: mocks.warning },
}));
vi.mock("@/packages/infrastructure/observability/client", () => ({
  clientLogger: { warn: mocks.warn },
}));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    category: { adminTree: { useQuery: () => ({ data: [] }) } },
    post: {
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

import { usePostEditor } from "./use-post-editor";

describe("usePostEditor", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: ReturnType<typeof usePostEditor> | undefined;
  const postId = "123456789012345678901234";
  const cover = {
    id: "cover-1",
    key: "cover.jpg",
    name: "cover.jpg",
    size: 100,
    type: "image/jpeg",
    url: "/cover.jpg",
    color: null,
    height: 1080,
    width: 1920,
    createdAt: null,
    updatedAt: null,
  };
  const tag = {
    id: "tag-1",
    name: { zh: "原标签", en: "Original tag" },
    createdAt: null,
    updatedAt: null,
  };
  const originalDetail: EditorDetail = {
    id: postId,
    categoryId: "category-1",
    coverId: cover.id,
    cover,
    type: PostType.ARTICLE,
    title: { zh: "原始标题" },
    galleryStyles: [tag],
    movieActors: [tag],
    movieDirectors: [tag],
    movieStyles: [tag],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.userId = "draft-user";
    mocks.detail = undefined;
    mocks.queryError = null;
    mocks.create.mockResolvedValue({ id: postId });
    mocks.update.mockResolvedValue({ id: postId });
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

  it("offers bilingual local edits after reopening without automatically replacing the server", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    await act(async () =>
      requireDefined(editor).form.setValue(
        "title",
        { zh: "本地草稿", en: "Local draft" },
        { shouldDirty: true },
      ),
    );
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    await act(async () => root.unmount());
    root = createRoot(container);
    await renderEditor(postId);
    expect(requireDefined(editor).form.getValues("title")).toEqual(
      originalDetail.title,
    );
    expect(requireDefined(editor).draft.pending).not.toBeNull();
    await act(async () => requireDefined(editor).draft.restore());
    expect(requireDefined(editor).form.getValues("title")).toEqual({
      zh: "本地草稿",
      en: "Local draft",
    });
    expect(requireDefined(editor).form.formState.isDirty).toBe(true);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not copy one account's dirty content into another account's backup", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    await act(async () =>
      requireDefined(editor).form.setValue(
        "title",
        { zh: "Account A secret" },
        { shouldDirty: true },
      ),
    );
    mocks.userId = "another-user";
    await rerenderEditor(postId);
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    expect(requireDefined(editor).form.getValues("title")).toEqual(
      originalDetail.title,
    );
    expect(
      localStorage.getItem(`honeycomb:draft:post:another-user:${postId}`),
    ).toBeNull();
  });

  it("does not resurrect a cleared cover when restoring a draft", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    await act(async () =>
      requireDefined(editor).photoPickerProps.handlePhotoClear(),
    );
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    await act(async () => root.unmount());
    root = createRoot(container);
    await renderEditor(postId);
    await act(async () => requireDefined(editor).draft.restore());
    expect(requireDefined(editor).form.getValues("coverId")).toBeUndefined();
    expect(requireDefined(editor).photoPickerProps.cover).toBeUndefined();
  });

  it.each([
    ["INTERNAL_SERVER_ERROR", "error"],
    ["NOT_FOUND", "not-found"],
  ])(
    "exposes %s load failures without a permanent busy state",
    async (code, expected) => {
      mocks.queryError = { data: { code } };
      await renderEditor(postId);
      expect(requireDefined(editor).loadError).toBe(expected);
      expect(requireDefined(editor).loading).toBe(false);
      expect(requireDefined(editor).readOnly).toBe(true);
      await act(async () => {
        await requireDefined(editor).submit(PostStatus.DRAFT, "create");
      });
      expect(mocks.create).not.toHaveBeenCalled();
      mocks.queryError = null;
      mocks.detail = originalDetail;
      await rerenderEditor(postId);
      expect(requireDefined(editor).loadError).toBeNull();
      expect(requireDefined(editor).readOnly).toBe(false);
    },
  );

  it("preserves dirty fields and cover/tag selections during a same-post refetch", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    const selectedCover = { ...cover, id: "cover-2", url: "/selected.jpg" };
    const selectedTag = { ...tag, id: "tag-2" };

    await act(async () => {
      const current = requireDefined(editor);
      current.form.setValue(
        "title",
        { zh: "未保存标题" },
        { shouldDirty: true },
      );
      current.form.setValue("coverId", selectedCover.id, { shouldDirty: true });
      current.setCoverPreview(selectedCover);
      current.setGalleryStyles([selectedTag]);
      current.setMovieActors([selectedTag]);
      current.setMovieDirectors([selectedTag]);
      current.setMovieStyles([selectedTag]);
    });
    mocks.detail = { ...originalDetail, title: { zh: "后台更新标题" } };
    await rerenderEditor(postId);

    const current = requireDefined(editor);
    expect(current.form.getValues("title")).toEqual({ zh: "未保存标题" });
    expect(current.form.getValues("coverId")).toBe(selectedCover.id);
    expect(current.form.formState.isDirty).toBe(true);
    expect(current.photoPickerProps.cover).toEqual(selectedCover);
    expect(current.galleryStyles).toEqual([selectedTag]);
    expect(current.movieActors).toEqual([selectedTag]);
    expect(current.movieDirectors).toEqual([selectedTag]);
    expect(current.movieStyles).toEqual([selectedTag]);
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
    expect(current.galleryStyles).toEqual([]);
    expect(current.movieActors).toEqual([]);
    expect(current.movieDirectors).toEqual([]);
    expect(current.movieStyles).toEqual([]);
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
      expect(current.form.getValues()).toEqual({ type: "ARTICLE" });
      expect(current.form.formState.isDirty).toBe(false);
      expect(current.photoPickerProps.cover).toBeUndefined();
      expect(current.galleryStyles).toEqual([]);
      expect(current.movieActors).toEqual([]);
      expect(current.movieDirectors).toEqual([]);
      expect(current.movieStyles).toEqual([]);

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
        expect(requireDefined(editor).galleryStyles).toEqual([tag]);
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
      current.setGalleryStyles([]);
      current.setMovieActors([]);
      current.setMovieDirectors([]);
      current.setMovieStyles([]);
    });
    const savedDetail = {
      ...originalDetail,
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
    expect(current.galleryStyles).toEqual([tag]);
    expect(current.movieActors).toEqual([tag]);
    expect(current.movieDirectors).toEqual([tag]);
    expect(current.movieStyles).toEqual([tag]);
  });

  it("keeps the saved values when refetch fails with an older cached detail", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    const selectedCover = { ...cover, id: "cover-2", url: "/selected.jpg" };
    const selectedTag = { ...tag, id: "tag-2" };
    await act(async () => {
      const current = requireDefined(editor);
      current.form.setValue("title", { zh: "保存标题" }, { shouldDirty: true });
      current.form.setValue("coverId", selectedCover.id, { shouldDirty: true });
      current.setCoverPreview(selectedCover);
      current.setGalleryStyles([selectedTag]);
      current.setMovieActors([selectedTag]);
      current.setMovieDirectors([selectedTag]);
      current.setMovieStyles([selectedTag]);
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
    expect(current.galleryStyles).toEqual([selectedTag]);
    expect(current.movieActors).toEqual([selectedTag]);
    expect(current.movieDirectors).toEqual([selectedTag]);
    expect(current.movieStyles).toEqual([selectedTag]);
  });

  it.each([true, false])(
    "preserves edits made while an update and refetch are pending (refresh succeeds: %s)",
    async (refreshSucceeds) => {
      mocks.detail = originalDetail;
      await renderEditor(postId);
      let resolveUpdate: ((value: { id: string }) => void) | undefined;
      let resolveRefresh: ((value: unknown) => void) | undefined;
      mocks.update.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve;
          }),
      );
      mocks.refetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );
      let saving: Promise<boolean> | undefined;
      await act(async () => {
        saving = requireDefined(editor).submit(PostStatus.PUBLISHED, "update");
      });
      await act(async () => {
        requireDefined(editor).form.setValue(
          "title",
          { zh: "Typed during save" },
          { shouldDirty: true },
        );
        requireDefined(resolveUpdate)({ id: postId });
      });
      const selectedCover = { ...cover, id: "cover-2" };
      const selectedTag = { ...tag, id: "tag-2" };
      await act(async () => {
        const current = requireDefined(editor);
        current.form.setValue("coverId", selectedCover.id, {
          shouldDirty: true,
        });
        current.setCoverPreview(selectedCover);
        current.setGalleryStyles([selectedTag]);
        current.setMovieActors([selectedTag]);
        current.setMovieDirectors([selectedTag]);
        current.setMovieStyles([selectedTag]);
      });
      await act(async () => {
        requireDefined(resolveRefresh)({
          isSuccess: refreshSucceeds,
          data: { ...originalDetail, status: PostStatus.PUBLISHED },
        });
        await saving;
      });
      const current = requireDefined(editor);
      expect(current.form.getValues("title")).toEqual({
        zh: "Typed during save",
      });
      expect(current.form.getValues("coverId")).toBe(selectedCover.id);
      expect(current.form.getValues("status")).toBe(PostStatus.PUBLISHED);
      expect(current.form.formState.isDirty).toBe(true);
      expect(current.photoPickerProps.cover).toEqual(selectedCover);
      expect(current.galleryStyles).toEqual([selectedTag]);
      expect(current.movieActors).toEqual([selectedTag]);
      expect(current.movieDirectors).toEqual([selectedTag]);
      expect(current.movieStyles).toEqual([selectedTag]);
    },
  );

  it("preserves independently updated tags when form values did not change during save", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    let resolveUpdate: ((value: { id: string }) => void) | undefined;
    mocks.update.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    mocks.refetch.mockResolvedValue({ isSuccess: true, data: originalDetail });
    let saving: Promise<boolean> | undefined;
    await act(async () => {
      saving = requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    const selectedTag = { ...tag, id: "tag-2" };
    await act(async () => {
      requireDefined(editor).setMovieStyles([selectedTag]);
    });
    await act(async () => {
      requireDefined(resolveUpdate)({ id: postId });
      await saving;
    });
    expect(requireDefined(editor).movieStyles).toEqual([selectedTag]);
  });

  it.each([true, false])(
    "does not reapply the explicit save refetch when its query data renders (immediately: %s)",
    async (immediately) => {
      mocks.detail = originalDetail;
      await renderEditor(postId);
      let resolveRefresh: ((value: unknown) => void) | undefined;
      mocks.refetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );
      let saving: Promise<boolean> | undefined;
      await act(async () => {
        saving = requireDefined(editor).submit(PostStatus.PUBLISHED, "update");
      });
      const selectedTag = { ...tag, id: "tag-2" };
      await act(async () => {
        requireDefined(editor).setMovieStyles([selectedTag]);
      });
      const savedDetail = { ...originalDetail, status: PostStatus.PUBLISHED };
      await act(async () => {
        if (immediately) mocks.detail = savedDetail;
        requireDefined(resolveRefresh)({ isSuccess: true, data: savedDetail });
        await saving;
      });
      if (!immediately) {
        mocks.detail = savedDetail;
        await rerenderEditor(postId);
      }
      expect(requireDefined(editor).movieStyles).toEqual([selectedTag]);
      expect(requireDefined(editor).form.formState.isDirty).toBe(false);
    },
  );

  it("does not navigate back to a created post after the user leaves the record", async () => {
    await renderEditor();
    let resolveCreate: ((value: { id: string }) => void) | undefined;
    mocks.create.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    let saving: Promise<boolean> | undefined;
    await act(async () => {
      saving = requireDefined(editor).submit(PostStatus.DRAFT, "create");
    });
    mocks.detail = originalDetail;
    await rerenderEditor(postId);
    await act(async () => {
      requireDefined(resolveCreate)({ id: "new-record" });
      await saving;
    });
    expect(mocks.push).not.toHaveBeenCalled();
    expect(requireDefined(editor).form.getValues("title")).toEqual(
      originalDetail.title,
    );
  });

  it.each(["unmount", "leave-and-return"])(
    "ignores stale create navigation after %s",
    async (navigation) => {
      await renderEditor();
      let resolveCreate: ((value: { id: string }) => void) | undefined;
      mocks.create.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      );
      let saving: Promise<boolean> | undefined;
      await act(async () => {
        saving = requireDefined(editor).submit(PostStatus.DRAFT, "create");
      });
      if (navigation === "unmount") {
        await act(async () => root.render(<div>Other page</div>));
      } else {
        mocks.detail = originalDetail;
        await rerenderEditor(postId);
        mocks.detail = undefined;
        await rerenderEditor(null);
        await act(async () => {
          requireDefined(editor).form.setValue(
            "title",
            { zh: "New draft" },
            { shouldDirty: true },
          );
        });
      }
      await act(async () => {
        requireDefined(resolveCreate)({ id: "created-record" });
        await saving;
      });
      expect(mocks.push).not.toHaveBeenCalled();
      if (navigation === "leave-and-return") {
        expect(requireDefined(editor).form.getValues("title")).toEqual({
          zh: "New draft",
        });
      }
    },
  );

  it("does not apply a pristine background refetch during an update", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    let resolveUpdate: ((value: { id: string }) => void) | undefined;
    mocks.update.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    let saving: Promise<boolean> | undefined;
    await act(async () => {
      saving = requireDefined(editor).submit(PostStatus.PUBLISHED, "update");
    });
    mocks.detail = { ...originalDetail, title: { zh: "Background snapshot" } };
    await rerenderEditor(postId);
    expect(requireDefined(editor).form.getValues("title")).toEqual(
      originalDetail.title,
    );
    await act(async () => {
      requireDefined(resolveUpdate)({ id: postId });
      await saving;
    });
  });

  it("does not reset another record when the previous update finishes", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    let resolveUpdate: ((value: { id: string }) => void) | undefined;
    mocks.update.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    mocks.refetch.mockResolvedValue({ isSuccess: true, data: originalDetail });
    let saving: Promise<boolean> | undefined;
    await act(async () => {
      saving = requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    const nextId = "234567890123456789012345";
    mocks.detail = {
      ...originalDetail,
      id: nextId,
      title: { zh: "Other post" },
    };
    await rerenderEditor(nextId);
    await act(async () => {
      requireDefined(resolveUpdate)({ id: postId });
      await saving;
    });
    expect(requireDefined(editor).form.getValues("title")).toEqual({
      zh: "Other post",
    });
    expect(requireDefined(editor).form.getValues("id")).toBe(nextId);
  });

  it.each(["create", "update"] as const)(
    "waits for %s and rejects same-tick duplicate submissions",
    async (action) => {
      if (action === "update") {
        mocks.detail = {
          id: postId,
          categoryId: "category-1",
          coverId: "cover-1",
          type: PostType.ARTICLE,
        };
      }
      let resolveMutation: ((value: { id: string }) => void) | undefined;
      const mutation = action === "create" ? mocks.create : mocks.update;
      mutation.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveMutation = resolve;
          }),
      );
      await renderEditor(action === "update" ? postId : null);
      let first: Promise<unknown> | undefined;
      let duplicate: Promise<unknown> | undefined;
      let settled = false;

      await act(async () => {
        const submit = requireDefined(editor).submit;
        first = submit(PostStatus.PUBLISHED, action);
        void first.then(() => {
          settled = true;
        });
        duplicate = submit(PostStatus.DRAFT, action);
      });

      expect(mutation).toHaveBeenCalledTimes(1);
      expect(settled).toBe(false);
      expect(container.textContent).toBe("saving");
      expect(requireDefined(editor).readOnly).toBe(action === "create");
      expect(mocks.success).not.toHaveBeenCalled();
      await expect(duplicate).resolves.toBe(false);

      await act(async () => {
        requireDefined(resolveMutation)({ id: postId });
        await first;
      });
      await expect(first).resolves.toBe(true);
      expect(container.textContent).toBe("idle");
      expect(mocks.success).toHaveBeenCalledOnce();
      if (action === "create") {
        expect(mocks.push).toHaveBeenCalledWith(
          `/admin/post/edit?id=${postId}`,
        );
      } else {
        expect(mocks.refetch).toHaveBeenCalledOnce();
      }
    },
  );

  it.each(["create", "update"] as const)(
    "handles %s failure and allows a later retry",
    async (action) => {
      if (action === "update") {
        mocks.detail = {
          id: postId,
          categoryId: "category-1",
          coverId: "cover-1",
          type: PostType.ARTICLE,
        };
      }
      const mutation = action === "create" ? mocks.create : mocks.update;
      mutation.mockRejectedValueOnce(new Error("network failed"));
      await renderEditor(action === "update" ? postId : null);

      await act(async () => {
        await expect(
          requireDefined(editor).submit(PostStatus.DRAFT, action),
        ).resolves.toBe(false);
      });
      expect(container.textContent).toBe("idle");
      expect(mocks.error).toHaveBeenCalledWith(
        action === "create" ? "添加失败" : "更新失败",
      );
      expect(mocks.success).not.toHaveBeenCalled();
      expect(mocks.push).not.toHaveBeenCalled();
      expect(mocks.refetch).not.toHaveBeenCalled();

      await act(async () => {
        await expect(
          requireDefined(editor).submit(PostStatus.DRAFT, action),
        ).resolves.toBe(true);
      });
      expect(mutation).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    ["create", PostStatus.DRAFT],
    ["create", PostStatus.PUBLISHED],
    ["update", PostStatus.DRAFT],
    ["update", PostStatus.PUBLISHED],
  ] as const)(
    "treats %s to %s as saved when public synchronization is degraded",
    async (action, status) => {
      if (action === "update") mocks.detail = originalDetail;
      const mutation = action === "create" ? mocks.create : mocks.update;
      mutation.mockResolvedValue({ id: postId, publicSync: "degraded" });
      await renderEditor(action === "update" ? postId : null);

      await act(async () => {
        await expect(
          requireDefined(editor).submit(status, action),
        ).resolves.toBe(true);
      });

      expect(mutation).toHaveBeenCalledOnce();
      expect(mocks.warning).toHaveBeenCalledWith(
        "已保存，公开内容同步未完成，请稍后检查公开页面",
      );
      expect(mocks.error).not.toHaveBeenCalled();
      expect(mocks.success).not.toHaveBeenCalled();
      expect(requireDefined(editor).form.formState.isDirty).toBe(false);
      if (action === "create")
        expect(mocks.push).toHaveBeenCalledWith(
          `/admin/post/edit?id=${postId}`,
        );
    },
  );

  it.each([
    ["completed", "rejects"],
    ["degraded", "rejects"],
    ["completed", "throws"],
    ["degraded", "throws"],
  ] as const)(
    "does not report a failed save after %s synchronization when admin refetch %s",
    async (publicSync, refreshFailure) => {
      mocks.detail = originalDetail;
      mocks.update.mockResolvedValue({ id: postId, publicSync });
      if (refreshFailure === "throws") {
        mocks.refetch.mockImplementation(() => {
          throw new Error("refresh failed");
        });
      } else mocks.refetch.mockRejectedValue(new Error("refresh failed"));
      await renderEditor(postId);
      await act(async () => {
        requireDefined(editor).form.setValue(
          "title",
          { zh: "保存标题" },
          { shouldDirty: true },
        );
      });
      await act(async () => {
        await expect(
          requireDefined(editor).submit(PostStatus.PUBLISHED, "update"),
        ).resolves.toBe(true);
      });
      expect(mocks.update).toHaveBeenCalledOnce();
      expect(mocks.error).not.toHaveBeenCalled();
      expect(requireDefined(editor).form.getValues("title")).toEqual({
        zh: "保存标题",
      });
      expect(requireDefined(editor).form.formState.isDirty).toBe(false);
      if (publicSync === "degraded")
        expect(mocks.warning).toHaveBeenCalledOnce();
      else expect(mocks.success).toHaveBeenCalledWith("更新成功");
    },
  );

  it("returns false for invalid form values without saving and releases the guard", async () => {
    await renderEditor();
    requireDefined(editor).form.setValue("categoryId", "");
    await act(async () => {
      await expect(
        requireDefined(editor).submit(PostStatus.DRAFT, "create"),
      ).resolves.toBe(false);
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(container.textContent).toBe("idle");

    requireDefined(editor).form.setValue("categoryId", "category-1");
    await act(async () => {
      await expect(
        requireDefined(editor).submit(PostStatus.DRAFT, "create"),
      ).resolves.toBe(true);
    });
  });

  it("returns false when the cover is missing", async () => {
    await renderEditor();
    requireDefined(editor).form.setValue("coverId", undefined);
    await act(async () => {
      await expect(
        requireDefined(editor).submit(PostStatus.DRAFT, "create"),
      ).resolves.toBe(false);
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("请上传封面");
    expect(container.textContent).toBe("idle");
  });
});
