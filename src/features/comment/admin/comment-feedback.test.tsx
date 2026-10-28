import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { CommentStatus } from "@/features/comment/types/comment.status";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  destroy: vi.fn(),
  refetch: vi.fn(),
  selection: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, warning: mocks.warning, error: mocks.error },
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    comment: {
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
  },
}));

import { useCommentActions } from "@/features/comment/admin/comment-actions";

let actions: ReturnType<typeof useCommentActions> | undefined;
function Harness() {
  const currentActions = useCommentActions({
    selectedRows: [],
    onSelectionChange: mocks.selection,
    refetch: mocks.refetch,
  });
  React.useEffect(() => {
    actions = currentActions;
  }, [currentActions]);
  return null;
}

describe("Comment public-sync feedback", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    actions = undefined;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<Harness />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  describe.each(["update", "destroy"] as const)("%s", (operation) => {
    it.each([
      { publicSync: "completed", refreshFails: false },
      { publicSync: "degraded", refreshFails: false },
      { publicSync: "completed", refreshFails: true },
      { publicSync: "degraded", refreshFails: true },
    ])(
      "keeps committed $publicSync writes successful (refresh rejects: $refreshFails)",
      async ({ publicSync, refreshFails }) => {
        mocks[operation].mockResolvedValue({ success: true, publicSync });
        if (refreshFails)
          mocks.refetch.mockRejectedValue(new Error("refresh failed"));

        const state =
          operation === "update"
            ? await requireDefined(actions).handleSetStatus(
                "comment-1",
                CommentStatus.PUBLISH,
              )
            : await requireDefined(actions).handleDelete(["comment-1"]);

        expect(state).toBe("success");
        expect(mocks[operation]).toHaveBeenCalledOnce();
        expect(mocks.refetch).toHaveBeenCalledOnce();
        expect(mocks.error).not.toHaveBeenCalled();
        if (publicSync === "degraded") {
          expect(mocks.warning).toHaveBeenCalledExactlyOnceWith(
            "已保存，公开内容同步未完成，请稍后检查公开页面",
          );
          expect(mocks.success).not.toHaveBeenCalled();
        } else {
          expect(mocks.success).toHaveBeenCalledExactlyOnceWith(
            operation === "update" ? "更新成功" : "删除成功",
          );
          expect(mocks.warning).not.toHaveBeenCalled();
        }
      },
    );
  });
  describe("comment moderation actions", () => {
    it("updates the selected comment status then refreshes with existing success copy", async () => {
      mocks.update.mockResolvedValue(undefined);
      expect(
        await requireDefined(actions).handleSetStatus(
          "comment-1",
          CommentStatus.PUBLISH,
        ),
      ).toBe("success");
      expect(mocks.update).toHaveBeenCalledWith({
        id: "comment-1",
        status: CommentStatus.PUBLISH,
      });
      expect(mocks.refetch).toHaveBeenCalledOnce();
      expect(mocks.success).toHaveBeenCalledWith("更新成功");
    });
    it("reports moderation failures without refreshing stale data", async () => {
      mocks.update.mockRejectedValue(new Error("network"));
      expect(
        await requireDefined(actions).handleSetStatus(
          "comment-1",
          CommentStatus.RUBBISH,
        ),
      ).toBe("error");
      expect(mocks.refetch).not.toHaveBeenCalled();
      expect(mocks.error).toHaveBeenCalledWith("更新失败");
    });
    it("keeps delete success feedback and refresh behavior", async () => {
      mocks.destroy.mockResolvedValue(undefined);
      expect(await requireDefined(actions).handleDelete(["comment-1"])).toBe(
        "success",
      );
      expect(mocks.destroy).toHaveBeenCalledWith({ ids: ["comment-1"] });
      expect(mocks.refetch).toHaveBeenCalledOnce();
      expect(mocks.success).toHaveBeenCalledWith("删除成功");
    });
    it("reports delete failures without refreshing", async () => {
      mocks.destroy.mockRejectedValue(new Error("delete failed"));
      expect(await requireDefined(actions).handleDelete(["comment-1"])).toBe(
        "error",
      );
      expect(mocks.refetch).not.toHaveBeenCalled();
      expect(mocks.error).toHaveBeenCalledWith("删除失败");
    });
  });
});
