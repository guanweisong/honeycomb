import { PostType } from "@/features/post/types/post.type";
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

describe("usePostEditor draft recovery and version conflicts", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: ReturnType<typeof usePostEditor> | undefined;
  const { postId, tag, originalDetail } = createPostEditorTestFixture();

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

  it("stages all tag roles as dirty form values and submits them atomically", async () => {
    mocks.detail = { ...originalDetail, version: 3 };
    await renderEditor(postId);
    await act(async () =>
      requireDefined(editor).form.setValue("movieActors", [], {
        shouldDirty: true,
      }),
    );
    expect(requireDefined(editor).form.formState.isDirty).toBe(true);
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: postId,
        expectedVersion: 3,
        movieActorIds: [],
        movieDirectorIds: [tag.id],
        movieStyleIds: [tag.id],
        galleryStyleIds: [tag.id],
      }),
    );
  });

  it("does not advance a dirty editor baseline on background refetch", async () => {
    mocks.detail = { ...originalDetail, version: 3 };
    await renderEditor(postId);
    await act(async () =>
      requireDefined(editor).form.setValue(
        "title",
        { zh: "local" },
        { shouldDirty: true },
      ),
    );
    mocks.detail = { ...originalDetail, version: 8 };
    await rerenderEditor(postId);
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ expectedVersion: 3 }),
    );
  });

  it("retains the confirmed version when refreshing fails", async () => {
    mocks.detail = { ...originalDetail, version: 3 };
    mocks.update.mockResolvedValueOnce({ id: postId, version: 4 });
    await renderEditor(postId);
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    await act(async () =>
      requireDefined(editor).form.setValue(
        "title",
        { zh: "second" },
        { shouldDirty: true },
      ),
    );
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ expectedVersion: 4 }),
    );
  });

  it("persists a frozen creation before network and retries the original intent after a read-only check", async () => {
    mocks.create.mockImplementationOnce(async (input) => {
      const saved = JSON.parse(
        localStorage.getItem(
          "honeycomb:draft:post:draft-user:creation-attempt",
        ) ?? "null",
      );
      expect(saved).toEqual(input);
      throw new Error("lost response");
    });
    await renderEditor();
    await act(async () =>
      requireDefined(editor).form.setValue(
        "title",
        { zh: "original" },
        { shouldDirty: true },
      ),
    );
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.DRAFT, "create");
    });
    const original = mocks.create.mock.calls[0]?.[0];
    await act(async () =>
      requireDefined(editor).form.setValue(
        "title",
        { zh: "later" },
        { shouldDirty: true },
      ),
    );
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.PUBLISHED, "create");
    });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await act(async () => {
      await requireDefined(editor).retryCreation();
    });
    expect(mocks.creationResult).toHaveBeenCalledOnce();
    expect(mocks.create).toHaveBeenLastCalledWith(original);
  });

  it("does not create again when a recovered attempt is found", async () => {
    mocks.create.mockRejectedValueOnce(new Error("lost response"));
    await renderEditor();
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.DRAFT, "create");
    });
    mocks.creationResult.mockResolvedValueOnce({
      isSuccess: true,
      data: { id: postId, version: 7 },
    });
    await act(async () => {
      await requireDefined(editor).retryCreation();
    });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.push).toHaveBeenCalledWith(`/admin/post/edit?id=${postId}`);
  });

  it("keeps local input on conflict and requires an explicit latest-version reload", async () => {
    mocks.detail = { ...originalDetail, version: 3 };
    mocks.update.mockRejectedValueOnce({ data: { code: "CONFLICT" } });
    await renderEditor(postId);
    await act(async () =>
      requireDefined(editor).form.setValue(
        "title",
        { zh: "local" },
        { shouldDirty: true },
      ),
    );
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    expect(requireDefined(editor).saveProblem).toBe("conflict");
    expect(requireDefined(editor).form.getValues("title")).toEqual({
      zh: "local",
    });
    mocks.refetch.mockResolvedValueOnce({
      isSuccess: true,
      data: { ...originalDetail, version: 8 },
    });
    await act(async () => {
      await requireDefined(editor).loadLatest();
    });
    expect(requireDefined(editor).form.getValues("title")).toEqual(
      originalDetail.title,
    );
    expect(requireDefined(editor).preservedDraft?.title).toEqual({
      zh: "local",
    });
    await act(async () => requireDefined(editor).restorePreservedDraft());
    expect(requireDefined(editor).form.getValues("title")).toEqual({
      zh: "local",
    });
    expect(requireDefined(editor).form.getValues("status")).toBe(
      originalDetail.status,
    );
    expect(requireDefined(editor).saveProblem).toBe("conflict");
    expect(requireDefined(editor).form.formState.isDirty).toBe(true);
  });

  it("retains input and does not send creation when synchronous storage fails", async () => {
    await renderEditor();
    await act(async () =>
      requireDefined(editor).form.setValue(
        "title",
        { zh: "keep me" },
        { shouldDirty: true },
      ),
    );
    const storage = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });
    try {
      await act(async () => {
        await requireDefined(editor).submit(PostStatus.DRAFT, "create");
      });
      expect(mocks.create).not.toHaveBeenCalled();
      expect(requireDefined(editor).form.getValues("title")).toEqual({
        zh: "keep me",
      });
      expect(mocks.error).toHaveBeenCalledWith(
        "无法保存创建凭据，请允许浏览器本地存储后重试",
      );
      expect(requireDefined(editor).saveProblem).toBeNull();
    } finally {
      storage.mockRestore();
    }
  });

  it("restores a frozen creation for read-only lookup without automatically recreating it", async () => {
    localStorage.setItem(
      "honeycomb:draft:post:draft-user:creation-attempt",
      JSON.stringify({
        creationToken: "123e4567-e89b-42d3-a456-426614174000",
        categoryId: "category-1",
        type: PostType.QUOTE,
      }),
    );
    await renderEditor();
    expect(requireDefined(editor).creationAttempt?.creationToken).toBe(
      "123e4567-e89b-42d3-a456-426614174000",
    );
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.userId = "other-user";
    await rerenderEditor();
    expect(requireDefined(editor).creationAttempt).toBeNull();
    expect(
      localStorage.getItem("honeycomb:draft:post:draft-user:creation-attempt"),
    ).not.toBeNull();
  });

  it("preserves edits arriving during first creation under the created record draft", async () => {
    let complete:
      ((value: { id: string; version: number }) => void) | undefined;
    mocks.create.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    await renderEditor();
    let saving: Promise<boolean> | undefined;
    await act(async () => {
      saving = requireDefined(editor).submit(PostStatus.DRAFT, "create");
    });
    await act(async () =>
      requireDefined(editor).form.setValue("movieActors", [tag], {
        shouldDirty: true,
      }),
    );
    await act(async () => {
      requireDefined(complete)({ id: postId, version: 0 });
      await saving;
    });
    const retained = JSON.parse(
      localStorage.getItem(`honeycomb:draft:post:draft-user:${postId}`) ??
        "null",
    );
    expect(retained?.values).toEqual(
      expect.objectContaining({
        baseVersion: 0,
        movieActors: [{ id: tag.id, name: tag.name }],
      }),
    );
  });

  it("preserves later edits under the created id when an unknown attempt is found", async () => {
    mocks.create.mockRejectedValueOnce(new Error("lost response"));
    await renderEditor();
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.DRAFT, "create");
    });
    await act(async () =>
      requireDefined(editor).form.setValue(
        "title",
        { zh: "later edit" },
        { shouldDirty: true },
      ),
    );
    mocks.creationResult.mockResolvedValueOnce({
      isSuccess: true,
      data: { id: postId, version: 9 },
    });
    await act(async () => {
      await requireDefined(editor).retryCreation();
    });
    const retained = JSON.parse(
      localStorage.getItem(`honeycomb:draft:post:draft-user:${postId}`) ??
        "null",
    );
    expect(retained?.values).toEqual(
      expect.objectContaining({ title: { zh: "later edit" }, baseVersion: 0 }),
    );
  });

  it("does not discard edits typed while loading the latest conflict version", async () => {
    mocks.detail = { ...originalDetail, version: 3 };
    await renderEditor(postId);
    let resolve: ((value: unknown) => void) | undefined;
    mocks.refetch.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    let loading: Promise<void> | undefined;
    await act(async () => {
      loading = requireDefined(editor).loadLatest();
    });
    await act(async () =>
      requireDefined(editor).form.setValue(
        "title",
        { zh: "typed during read" },
        { shouldDirty: true },
      ),
    );
    await act(async () => {
      requireDefined(resolve)({
        isSuccess: true,
        data: { ...originalDetail, version: 9 },
      });
      await loading;
    });
    expect(requireDefined(editor).form.getValues("title")).toEqual({
      zh: "typed during read",
    });
    await act(async () => {
      await requireDefined(editor).submit(PostStatus.DRAFT, "update");
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ expectedVersion: 3 }),
    );
  });

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
      mocks.creationResult.mockResolvedValue({ isSuccess: true, data: null });
      mocks.detail = originalDetail;
      await rerenderEditor(postId);
      expect(requireDefined(editor).loadError).toBeNull();
      expect(requireDefined(editor).readOnly).toBe(false);
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
