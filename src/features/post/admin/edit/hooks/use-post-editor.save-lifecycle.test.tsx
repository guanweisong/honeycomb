import { createAdminListCache } from "@tests/helpers/admin-list-cache";
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
  confirmedCreation: null as { id: string; version: number } | null,
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
    useUtils: () => cache.utils,
    category: { adminTree: { useQuery: () => ({ data: [] }) } },
    post: {
      creationResult: {
        useQuery: () => ({
          data: mocks.confirmedCreation,
          isSuccess: Boolean(mocks.confirmedCreation),
          refetch: mocks.creationResult,
        }),
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

let cache: ReturnType<typeof createAdminListCache>;

describe("usePostEditor asynchronous save lifecycle", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: ReturnType<typeof usePostEditor> | undefined;
  const { postId, cover, tag, originalDetail } = createPostEditorTestFixture();

  beforeEach(() => {
    vi.resetAllMocks();
    cache = createAdminListCache("post");
    localStorage.clear();
    mocks.confirmedCreation = null;
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

  it.each(["create", "update"] as const)(
    "invalidates every fresh list after %s",
    async (action) => {
      if (action === "update") mocks.detail = originalDetail;
      await renderEditor(action === "update" ? postId : null);
      await act(async () => {
        expect(
          await requireDefined(editor).submit(PostStatus.DRAFT, action),
        ).toBe(true);
      });
      expect(await cache.readLists()).toEqual([
        { title: "Saved title" },
        { title: "Saved title" },
      ]);
      expect(cache.reads).toBe(2);
    },
  );

  it.each(["create", "update"] as const)(
    "keeps a confirmed %s successful when list refresh rejects",
    async (action) => {
      if (action === "update") mocks.detail = originalDetail;
      await renderEditor(action === "update" ? postId : null);
      vi.spyOn(cache.queryClient, "invalidateQueries").mockRejectedValueOnce(
        new Error("refresh unavailable"),
      );
      await act(async () => {
        expect(
          await requireDefined(editor).submit(PostStatus.DRAFT, action),
        ).toBe(true);
      });
      expect(requireDefined(editor).saveProblem).toBeNull();
      expect(mocks[action]).toHaveBeenCalledTimes(1);
      expect(mocks.error).not.toHaveBeenCalled();
    },
  );

  it("does not invalidate fresh lists after a rejected write", async () => {
    mocks.detail = originalDetail;
    mocks.update.mockRejectedValue({ data: { code: "FORBIDDEN" } });
    await renderEditor(postId);
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    expect(await cache.readLists()).toEqual([
      { title: "Old title" },
      { title: "Old title" },
    ]);
    expect(cache.reads).toBe(0);
  });

  it.each([true, false])(
    "preserves edits made while an update and refetch are pending (refresh succeeds: %s)",
    async (refreshSucceeds) => {
      mocks.detail = originalDetail;
      await renderEditor(postId);
      let resolveUpdate:
        ((value: { id: string; version: number }) => void) | undefined;
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
        requireDefined(resolveUpdate)({ id: postId, version: 1 });
      });
      const selectedCover = { ...cover, id: "cover-2" };
      const selectedTag = { ...tag, id: "222222222222222222222222" };
      await act(async () => {
        const current = requireDefined(editor);
        current.form.setValue("coverId", selectedCover.id, {
          shouldDirty: true,
        });
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
    },
  );

  it("preserves independently updated tags when form values did not change during save", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    let resolveUpdate:
      ((value: { id: string; version: number }) => void) | undefined;
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
    const selectedTag = { ...tag, id: "222222222222222222222222" };
    await act(async () => {
      requireDefined(editor).form.setValue("movieStyles", [selectedTag], {
        shouldDirty: true,
      });
    });
    await act(async () => {
      requireDefined(resolveUpdate)({ id: postId, version: 1 });
      await saving;
    });
    expect(requireDefined(editor).form.getValues("movieStyles")).toEqual([
      expect.objectContaining({ id: selectedTag.id, name: selectedTag.name }),
    ]);
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
      const selectedTag = { ...tag, id: "222222222222222222222222" };
      await act(async () => {
        requireDefined(editor).form.setValue("movieStyles", [selectedTag], {
          shouldDirty: true,
        });
      });
      const savedDetail = {
        ...originalDetail,
        version: 1,
        status: PostStatus.PUBLISHED,
      };
      await act(async () => {
        if (immediately) mocks.detail = savedDetail;
        requireDefined(resolveRefresh)({ isSuccess: true, data: savedDetail });
        await saving;
      });
      if (!immediately) {
        mocks.detail = savedDetail;
        await rerenderEditor(postId);
      }
      expect(requireDefined(editor).form.getValues("movieStyles")).toEqual([
        expect.objectContaining({ id: selectedTag.id, name: selectedTag.name }),
      ]);
      expect(requireDefined(editor).form.formState.isDirty).toBe(true);
    },
  );

  it("does not navigate back to a created post after the user leaves the record", async () => {
    await renderEditor();
    let resolveCreate:
      ((value: { id: string; version: number }) => void) | undefined;
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
      requireDefined(resolveCreate)({ id: "new-record", version: 0 });
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
      let resolveCreate:
        ((value: { id: string; version: number }) => void) | undefined;
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
        requireDefined(resolveCreate)({ id: "created-record", version: 0 });
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
    let resolveUpdate:
      ((value: { id: string; version: number }) => void) | undefined;
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
      requireDefined(resolveUpdate)({ id: postId, version: 1 });
      await saving;
    });
  });

  it.each(["load", "retry"])(
    "silences stale %s failures after the account changes",
    async (operation) => {
      if (operation === "load") mocks.detail = originalDetail;
      await renderEditor(operation === "load" ? postId : null);
      if (operation === "retry") {
        mocks.create.mockRejectedValueOnce(new Error("Unknown create"));
        await act(async () => {
          await requireDefined(editor).submit(PostStatus.DRAFT, "create");
        });
      }
      let reject: ((error: Error) => void) | undefined;
      const pending = new Promise((_, fail) => {
        reject = fail;
      });
      if (operation === "load") mocks.refetch.mockReturnValueOnce(pending);
      else mocks.creationResult.mockReturnValueOnce(pending);
      let request: Promise<void> | undefined;
      await act(async () => {
        request =
          operation === "load"
            ? requireDefined(editor).loadLatest()
            : requireDefined(editor).retryCreation();
      });
      mocks.userId = "other-user";
      mocks.detail = originalDetail;
      await rerenderEditor(postId);
      mocks.error.mockClear();
      let finish:
        ((value: { id: string; version: number }) => void) | undefined;
      mocks.update.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
      let saving: Promise<boolean> | undefined;
      await act(async () => {
        saving = requireDefined(editor).submit(PostStatus.DRAFT, "update");
      });
      await act(async () => {
        reject?.(new Error("Late failure"));
        await request;
      });
      expect(mocks.error).not.toHaveBeenCalled();
      expect(requireDefined(editor).loading).toBe(true);
      await act(async () => {
        finish?.({ id: postId, version: 1 });
        await saving;
      });
    },
  );

  it.each(["record", "return", "account", "unmount"])(
    "isolates a pending update after changing %s",
    async (change) => {
      mocks.detail = originalDetail;
      await renderEditor(postId);
      let finish:
        ((value: { id: string; version: number }) => void) | undefined;
      mocks.update.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
      let saving: Promise<boolean> | undefined;
      await act(async () => {
        saving = requireDefined(editor).submit(PostStatus.DRAFT, "update");
      });
      if (change === "unmount") await act(async () => root.render(null));
      else if (change === "account") {
        mocks.userId = "other-user";
        await rerenderEditor(postId);
      } else {
        const nextId = "234567890123456789012345";
        mocks.detail = { ...originalDetail, id: nextId };
        await rerenderEditor(nextId);
        if (change === "return") {
          mocks.detail = originalDetail;
          await rerenderEditor(postId);
        }
      }
      if (change !== "unmount")
        expect(requireDefined(editor).loading).toBe(false);
      await act(async () => {
        finish?.({ id: postId, version: 1 });
        await saving;
      });
      expect(mocks.refetch).not.toHaveBeenCalled();
      expect(mocks.success).not.toHaveBeenCalled();
      expect(mocks.warning).not.toHaveBeenCalled();
      if (change !== "account") {
        expect(await cache.readLists()).toEqual([
          { title: "Saved title" },
          { title: "Saved title" },
        ]);
      }
    },
  );

  it("allows a new record to save while old refresh hangs and does not release its busy state", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    let finishRefresh: ((value: unknown) => void) | undefined;
    mocks.refetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRefresh = resolve;
        }),
    );
    let oldSave: Promise<boolean> | undefined;
    await act(async () => {
      oldSave = requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    const nextId = "234567890123456789012345";
    mocks.detail = { ...originalDetail, id: nextId };
    await rerenderEditor(nextId);
    let finishUpdate:
      ((value: { id: string; version: number }) => void) | undefined;
    mocks.update.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishUpdate = resolve;
        }),
    );
    let newSave: Promise<boolean> | undefined;
    await act(async () => {
      newSave = requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    expect(mocks.update).toHaveBeenCalledTimes(2);
    await act(async () => {
      finishRefresh?.({});
      await oldSave;
    });
    expect(requireDefined(editor).loading).toBe(true);
    expect(mocks.success).not.toHaveBeenCalled();
    await act(async () => {
      finishUpdate?.({ id: nextId, version: 1 });
      await newSave;
    });
    expect(requireDefined(editor).loading).toBe(false);
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });

  it("does not reset another record when the previous update finishes", async () => {
    mocks.detail = originalDetail;
    await renderEditor(postId);
    let resolveUpdate:
      ((value: { id: string; version: number }) => void) | undefined;
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
      requireDefined(resolveUpdate)({ id: postId, version: 1 });
      await saving;
    });
    expect(requireDefined(editor).form.getValues("title")).toEqual({
      zh: "Other post",
    });
    expect(requireDefined(editor).form.getValues("id")).toBe(nextId);
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
