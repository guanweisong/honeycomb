import React, { act } from "react";
import { z } from "zod";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";
import {
  createPostEditorTestFixture,
  type PostEditorTestDetail as EditorDetail,
} from "@tests/helpers/post-editor-test-helpers";

import type { trpc } from "@/lib/trpc/client/trpc";

type CreatePostMutation = ReturnType<
  typeof trpc.post.create.useMutation
>["mutateAsync"];
type UpdatePostMutation = ReturnType<
  typeof trpc.post.update.useMutation
>["mutateAsync"];
type SavedPost = Awaited<ReturnType<UpdatePostMutation>>;

const mocks = vi.hoisted(() => ({
  userId: "draft-user",
  create: vi.fn<CreatePostMutation>(),
  update: vi.fn<UpdatePostMutation>(),
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

vi.mock("@/app/admin/(dashboard)/providers/use-current-user", () => ({
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

import { usePostEditor } from "@/app/admin/(dashboard)/post/edit/components/hooks/use-post-editor";

describe("usePostEditor submission outcomes and validation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: ReturnType<typeof usePostEditor> | undefined;
  const { postId, originalDetail } = createPostEditorTestFixture();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.userId = "draft-user";
    mocks.detail = undefined;
    mocks.queryError = null;
    mocks.creationResult.mockResolvedValue({ isSuccess: true, data: null });
    mocks.create.mockResolvedValue({
      id: postId,
      version: 1,
      publicSync: "completed",
    });
    mocks.update.mockResolvedValue({
      id: postId,
      version: 1,
      publicSync: "completed",
    });
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
    "waits for %s and rejects same-tick duplicate submissions",
    async (action) => {
      if (action === "update") {
        mocks.detail = {
          id: postId,
          version: 0,
          categoryId: "category-1",
          coverId: "cover-1",
          type: PostType.ARTICLE,
        };
      }
      let resolveMutation: ((value: SavedPost) => void) | undefined;
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
        requireDefined(resolveMutation)({
          id: postId,
          version: 1,
          publicSync: "completed",
        });
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
          version: 0,
          categoryId: "category-1",
          coverId: "cover-1",
          type: PostType.ARTICLE,
        };
      }
      const mutation = action === "create" ? mocks.create : mocks.update;
      mutation.mockRejectedValueOnce({ data: { code: "BAD_REQUEST" } });
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
      mutation.mockResolvedValue({
        id: postId,
        version: 1,
        publicSync: "degraded",
      });
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
      mocks.update.mockResolvedValue({ id: postId, version: 1, publicSync });
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
      mocks.update.mockResolvedValue({ id: postId, version: 2, publicSync });
      await act(async () => {
        requireDefined(editor).form.setValue(
          "title",
          { zh: "再次保存" },
          { shouldDirty: true },
        );
        await expect(
          requireDefined(editor).submit(PostStatus.DRAFT, "update"),
        ).resolves.toBe(true);
      });
      expect(mocks.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ expectedVersion: 1 }),
      );
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

  it.each([
    [new z.ZodError([]), "unknown"],
    [{ data: { code: { toString: () => "FORBIDDEN" } } }, null],
  ])(
    "retains post-specific thrown-error classification %#",
    async (error, problem) => {
      mocks.detail = { ...originalDetail, version: 3 };
      mocks.update.mockRejectedValueOnce(error);
      await renderEditor(postId);
      await act(async () => {
        await requireDefined(editor).submit(PostStatus.DRAFT, "update");
      });
      expect(requireDefined(editor).saveProblem).toBe(problem);
      expect(mocks.error).toHaveBeenCalledWith(
        problem === "unknown"
          ? "保存结果暂时无法确认，本地内容已保留，请先核对"
          : "更新失败",
      );
    },
  );

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

vi.mock(
  "@/app/admin/(dashboard)/post/edit/components/hooks/use-post-creation-result",
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
