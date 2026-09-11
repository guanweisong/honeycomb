import { describe, expect, it, vi } from "vitest";
import { createLink, destroyLinks, updateLink } from "./link-use-cases";

const link = {
  id: "507f1f77bcf86cd799439031",
  name: "Example",
  url: "https://example.test",
  logo: "https://example.test/logo.png",
  description: null,
  status: "ENABLE",
  createdAt: null,
  updatedAt: null,
};

describe("Link cache side effects", () => {
  it("每个成功写操作都会失效全部公开内容", async () => {
    const invalidator = { invalidate: vi.fn().mockResolvedValue(undefined) };

    await createLink(
      { create: vi.fn().mockResolvedValue(link) },
      { name: link.name, url: link.url, logo: link.logo },
      invalidator,
    );
    await updateLink(
      { update: vi.fn().mockResolvedValue(link) },
      { id: link.id, name: "Updated" },
      invalidator,
    );
    await destroyLinks(
      { destroy: vi.fn().mockResolvedValue({ success: true }) },
      [link.id],
      invalidator,
    );

    expect(invalidator.invalidate).toHaveBeenCalledTimes(3);
    expect(invalidator.invalidate).toHaveBeenNthCalledWith(1, {
      refreshLayout: true,
    });
  });

  it("先持久化友情链接，再失效缓存", async () => {
    const order: string[] = [];
    const repository = {
      create: vi.fn(async () => {
        order.push("repository");
        return link;
      }),
    };
    const invalidator = {
      invalidate: vi.fn(async () => {
        order.push("cache");
      }),
    };

    await createLink(
      repository,
      { name: link.name, url: link.url, logo: link.logo },
      invalidator,
    );

    expect(order).toEqual(["repository", "cache"]);
  });

  it("Repository 写入失败时不失效缓存", async () => {
    const databaseError = new Error("database failed");
    const invalidator = { invalidate: vi.fn() };

    await expect(
      updateLink(
        { update: vi.fn().mockRejectedValue(databaseError) },
        { id: link.id },
        invalidator,
      ),
    ).rejects.toBe(databaseError);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });

  it("持久化成功后的缓存失败继续传播", async () => {
    const cacheError = new Error("cache failed");
    const destroy = vi.fn().mockResolvedValue({ success: true });

    await expect(
      destroyLinks({ destroy }, [link.id], {
        invalidate: vi.fn().mockRejectedValue(cacheError),
      }),
    ).rejects.toBe(cacheError);
    expect(destroy).toHaveBeenCalledWith([link.id]);
  });
});
