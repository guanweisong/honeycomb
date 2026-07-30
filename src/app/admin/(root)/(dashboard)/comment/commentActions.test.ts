import { describe, expect, it, vi } from "vitest";

import { CommentStatus } from "@/packages/trpc/api/modules/comment/types/comment.status";
import {
  submitCommentBatchDelete,
  submitCommentDelete,
  submitCommentStatusUpdate,
} from "./commentActions";

describe("comment moderation actions", () => {
  it("updates the selected comment status then refreshes with existing success copy", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const refetch = vi.fn();
    const notifySuccess = vi.fn();

    await expect(
      submitCommentStatusUpdate({
        id: "comment-1",
        status: CommentStatus.PUBLISH,
        update,
        refetch,
        notifySuccess,
        notifyError: vi.fn(),
      }),
    ).resolves.toBe("success");

    expect(update).toHaveBeenCalledWith({
      id: "comment-1",
      status: CommentStatus.PUBLISH,
    });
    expect(refetch).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith("更新成功");
  });

  it("reports moderation failures without refreshing stale data", async () => {
    const refetch = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitCommentStatusUpdate({
        id: "comment-1",
        status: CommentStatus.RUBBISH,
        update: vi.fn().mockRejectedValue(new Error("network")),
        refetch,
        notifySuccess: vi.fn(),
        notifyError,
      }),
    ).resolves.toBe("error");

    expect(refetch).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith("更新失败");
  });

  it("deletes the selected ids and clears batch selection after the action settles", async () => {
    const deleteItems = vi.fn().mockResolvedValue("error");
    const onSelectionChange = vi.fn();

    await submitCommentBatchDelete({
      selectedRows: [{ id: "comment-1" }, { id: "comment-2" }],
      deleteItems,
      onSelectionChange,
    });

    expect(deleteItems).toHaveBeenCalledWith(["comment-1", "comment-2"]);
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it("keeps delete success feedback and refresh behavior", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    const refetch = vi.fn();
    const notifySuccess = vi.fn();

    await expect(
      submitCommentDelete({
        ids: ["comment-1"],
        destroy,
        refetch,
        notifySuccess,
        notifyError: vi.fn(),
      }),
    ).resolves.toBe("success");

    expect(destroy).toHaveBeenCalledWith({ ids: ["comment-1"] });
    expect(refetch).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith("删除成功");
  });

  it("reports delete failures without refreshing", async () => {
    const refetch = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitCommentDelete({
        ids: ["comment-1"],
        destroy: vi.fn().mockRejectedValue(new Error("delete failed")),
        refetch,
        notifySuccess: vi.fn(),
        notifyError,
      }),
    ).resolves.toBe("error");
    expect(refetch).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith("删除失败");
  });
});
