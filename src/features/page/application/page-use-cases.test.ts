import { describe, expect, it, vi } from "vitest";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { createPage, destroyPages, updatePage } from "./page-use-cases";

const pageId = "507f1f77bcf86cd799439021";
const secondPageId = "507f1f77bcf86cd799439022";
const input = {
  title: { zh: "页面", en: "Page" },
  content: { zh: "正文", en: "Content" },
  template: PageTemplate.DEFAULT,
};

describe("Page cache side effects", () => {
  it("创建成功后按顺序失效新页面缓存", async () => {
    const order: string[] = [];
    const repository = {
      create: vi.fn(async () => {
        order.push("repository");
        return { id: pageId };
      }),
    };
    const invalidator = {
      invalidateContent: vi.fn(async () => {
        order.push("cache");
      }),
    };

    await expect(
      createPage(repository, input, "author-1", invalidator),
    ).resolves.toEqual({ id: pageId });
    expect(order).toEqual(["repository", "cache"]);
    expect(invalidator.invalidateContent).toHaveBeenCalledWith({
      id: pageId,
      type: "page",
    });
  });

  it("数据库写入失败时不失效页面缓存", async () => {
    const invalidator = { invalidateContent: vi.fn() };

    await expect(
      createPage(
        { create: vi.fn().mockRejectedValue(new Error("database failed")) },
        input,
        "author-1",
        invalidator,
      ),
    ).rejects.toThrow("database failed");
    expect(invalidator.invalidateContent).not.toHaveBeenCalled();
  });

  it("批量删除成功后失效每个页面目标", async () => {
    const invalidator = {
      invalidateContent: vi.fn().mockResolvedValue(undefined),
    };

    await destroyPages(
      { destroy: vi.fn().mockResolvedValue({ success: true }) },
      [pageId, secondPageId],
      invalidator,
    );

    expect(invalidator.invalidateContent.mock.calls).toEqual([
      [{ id: pageId, type: "page" }],
      [{ id: secondPageId, type: "page" }],
    ]);
  });

  it("更新成功后失效页面缓存并传播缓存失败", async () => {
    const cacheError = new Error("cache failed");

    await expect(
      updatePage(
        {
          findStatus: vi.fn(),
          update: vi.fn().mockResolvedValue({ id: pageId }),
        },
        { id: pageId },
        { invalidateContent: vi.fn().mockRejectedValue(cacheError) },
      ),
    ).rejects.toBe(cacheError);
  });
});
