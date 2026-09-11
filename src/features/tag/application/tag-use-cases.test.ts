import { describe, expect, it, vi } from "vitest";
import { createTag, destroyTags, updateTag } from "./tag-use-cases";

describe("Tag command use cases", () => {
  it("在写入成功后刷新公开内容", async () => {
    const invalidator = { invalidate: vi.fn().mockResolvedValue(undefined) };
    const create = vi.fn().mockResolvedValue({ id: "tag-1" });
    const update = vi.fn().mockResolvedValue({ id: "tag-1" });
    const destroy = vi.fn().mockResolvedValue({ success: true });

    await createTag(
      { create },
      { name: { en: "Tag", zh: "标签" } },
      invalidator,
    );
    await updateTag({ update }, { id: "tag-1" }, invalidator);
    await destroyTags({ destroy }, ["tag-1"], invalidator);

    expect(invalidator.invalidate).toHaveBeenCalledTimes(3);
    expect(invalidator.invalidate).toHaveBeenNthCalledWith(1, {
      refreshLayout: true,
      refreshPostIndex: true,
    });
    expect(invalidator.invalidate).toHaveBeenNthCalledWith(2, {
      refreshLayout: true,
      refreshPostIndex: true,
    });
    expect(invalidator.invalidate).toHaveBeenNthCalledWith(3, {
      refreshLayout: true,
      refreshPostIndex: true,
    });
  });

  it("写入失败时不刷新缓存", async () => {
    const invalidator = { invalidate: vi.fn() };
    const error = new Error("database failed");

    await expect(
      updateTag(
        { update: vi.fn().mockRejectedValue(error) },
        { id: "tag-1" },
        invalidator,
      ),
    ).rejects.toBe(error);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});
