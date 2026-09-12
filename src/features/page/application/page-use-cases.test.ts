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
      invalidate: vi.fn(async () => {
        order.push("cache");
        return { state: "completed" as const };
      }),
    };

    await expect(
      createPage(repository, input, "author-1", invalidator),
    ).resolves.toEqual({ id: pageId });
    expect(order).toEqual(["repository", "cache"]);
    expect(invalidator.invalidate).toHaveBeenCalledWith({
      contents: [{ id: pageId, type: "page" }],
      refreshLayout: true,
      refreshSitemap: true,
    });
  });

  it("数据库写入失败时不失效页面缓存", async () => {
    const invalidator = { invalidate: vi.fn() };

    await expect(
      createPage(
        { create: vi.fn().mockRejectedValue(new Error("database failed")) },
        input,
        "author-1",
        invalidator,
      ),
    ).rejects.toThrow("database failed");
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });

  it("批量删除成功后失效每个页面目标", async () => {
    const invalidator = {
      invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
    };

    await destroyPages(
      { destroy: vi.fn().mockResolvedValue({ success: true }) },
      [pageId, secondPageId],
      invalidator,
    );

    expect(invalidator.invalidate).toHaveBeenCalledOnce();
    expect(invalidator.invalidate).toHaveBeenCalledWith({
      contents: [
        { id: pageId, type: "page" },
        { id: secondPageId, type: "page" },
      ],
      refreshLayout: true,
      refreshSitemap: true,
    });
  });

  it("更新已提交后缓存降级仍返回持久化结果", async () => {
    const saved = { id: pageId };

    await expect(
      updatePage(
        {
          findStatus: vi.fn(),
          update: vi.fn().mockResolvedValue(saved),
        },
        { id: pageId },
        {
          invalidate: vi.fn().mockResolvedValue({ state: "degraded" as const }),
        },
      ),
    ).resolves.toEqual(saved);
  });
});
