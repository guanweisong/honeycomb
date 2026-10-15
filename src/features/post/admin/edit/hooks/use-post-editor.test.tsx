import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { PostStatus } from "@/packages/domain/content/post-status";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  refetch: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  detail: undefined as
    | { id: string; categoryId: string; coverId: string; type: "ARTICLE" }
    | undefined,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));
vi.mock("@/packages/infrastructure/observability/client", () => ({
  clientLogger: { warn: mocks.warn },
}));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    category: { adminTree: { useQuery: () => ({ data: [] }) } },
    post: {
      adminDetail: {
        useQuery: () => ({ data: mocks.detail, refetch: mocks.refetch }),
      },
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
    },
  },
}));

import { usePostEditor } from "./use-post-editor";

describe("usePostEditor submissions", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: ReturnType<typeof usePostEditor> | undefined;
  const postId = "123456789012345678901234";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.detail = undefined;
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

  async function renderEditor(id: string | null = null) {
    function Harness() {
      editor = usePostEditor(id);
      return <span>{editor.loading ? "saving" : "idle"}</span>;
    }

    await act(async () => root.render(<Harness />));
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
          categoryId: "category-1",
          coverId: "cover-1",
          type: "ARTICLE",
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
          type: "ARTICLE",
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
