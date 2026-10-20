import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { PageStatus } from "@/features/page/page-status";
import { createPage, updatePage, destroyPages } from "./server";
import { PageTemplate } from "./page-template";
const input = {
  title: { zh: "标题", en: "Title" },
  content: { zh: "正文", en: "Content" },
  template: PageTemplate.DEFAULT,
};
const id = "page-1";
const cache = (state: "completed" | "degraded" = "completed") => ({
  invalidate: vi.fn().mockResolvedValue({ state }),
});
const targets = (ids: string[]) => ({
  contents: ids.map((id) => ({ id, type: "page" })),
  refreshLayout: true,
  refreshSitemap: true,
});

describe("page direct writes and public synchronization", () => {
  it("creates the record in a transaction before invalidating public data", async () => {
    const fake = createMockDb();
    const order: string[] = [];
    fake.returning.mockImplementation(async () => {
      order.push("write");
      return [{ id }];
    });
    const invalidator = {
      invalidate: vi.fn(async () => {
        order.push("invalidate");
        return { state: "completed" as const };
      }),
    };
    await expect(
      createPage(asMockDatabase(fake), input, "author", invalidator),
    ).resolves.toEqual({ id, publicSync: "completed" });
    expect(order).toEqual(["write", "invalidate"]);
    expect(fake.transaction).toHaveBeenCalledOnce();
    expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith(
      targets([id]),
    );
  });
  it("does not invalidate public data after a failed create", async () => {
    const fake = createMockDb();
    fake.returning.mockRejectedValue(new Error("database failed"));
    const invalidator = cache();
    await expect(
      createPage(asMockDatabase(fake), input, "author", invalidator),
    ).rejects.toThrow("database failed");
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
  it("invalidates every deleted item only after deleting", async () => {
    const fake = createMockDb();
    const order: string[] = [];
    fake.where.mockImplementation(async () => {
      order.push("delete");
    });
    const invalidator = {
      invalidate: vi.fn(async () => {
        order.push("invalidate");
        return { state: "completed" as const };
      }),
    };
    await expect(
      destroyPages(asMockDatabase(fake), [id, "second"], invalidator),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(order).toEqual(["delete", "invalidate"]);
    expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith(
      targets([id, "second"]),
    );
  });
  it.each(["completed", "degraded"] as const)(
    "returns committed writes with %s public synchronization without retrying",
    async (state) => {
      const fake = createMockDb();
      fake.returning.mockResolvedValue([{ id }]);
      fake.limit.mockResolvedValue([{ id }]);
      const invalidator = cache(state);
      await expect(
        createPage(asMockDatabase(fake), input, "author", invalidator),
      ).resolves.toEqual({ id, publicSync: state });
      await expect(
        updatePage(asMockDatabase(fake), { id }, invalidator),
      ).resolves.toEqual({ id, publicSync: state });
      expect(fake.returning).toHaveBeenCalledOnce();
      expect(fake.transaction).toHaveBeenCalledTimes(2);
      expect(invalidator.invalidate).toHaveBeenCalledTimes(2);
      expect(invalidator.invalidate).toHaveBeenLastCalledWith(targets([id]));
    },
  );
  it("rejects missing persisted create and update results", async () => {
    const fake = createMockDb();
    fake.returning.mockResolvedValue([]);
    fake.limit.mockResolvedValue([]);
    const invalidator = cache();
    await expect(
      createPage(asMockDatabase(fake), input, "author", invalidator),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    await expect(
      updatePage(asMockDatabase(fake), { id }, invalidator),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});

describe("page update sequencing", () => {
  it.each([
    [PageStatus.DRAFT, PageStatus.PUBLISHED],
    [PageStatus.TO_AUDIT, PageStatus.PUBLISHED],
    [PageStatus.PUBLISHED, PageStatus.DRAFT],
  ])(
    "%s → %s reads current status, writes, then invalidates",
    async (current, target) => {
      const fake = createMockDb();
      const order: string[] = [];
      fake.limit.mockImplementation(async () => {
        order.push("read");
        return [{ status: current }];
      });
      fake.returning.mockImplementation(async () => {
        order.push("write");
        return [{ id }];
      });
      const invalidator = {
        invalidate: vi.fn(async () => {
          order.push("invalidate");
          return { state: "completed" as const };
        }),
      };
      await expect(
        updatePage(asMockDatabase(fake), { id, status: target }, invalidator),
      ).resolves.toEqual({ id, publicSync: "completed" });
      expect(order).toEqual(["read", "write", "invalidate"]);
      expect(fake.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: target }),
      );
      expect(fake.transaction).toHaveBeenCalledOnce();
    },
  );
  it("does not read current status when status is omitted", async () => {
    const fake = createMockDb();
    fake.returning.mockResolvedValue([{ id }]);
    await updatePage(
      asMockDatabase(fake),
      { id, title: { zh: "标题", en: "Title" } },
      cache(),
    );
    expect(fake.limit).not.toHaveBeenCalled();
  });
  it.each([PageStatus.PUBLISHED, PageStatus.DRAFT, PageStatus.TO_AUDIT])(
    "keeps an unchanged %s status",
    async (status) => {
      const fake = createMockDb();
      fake.limit.mockResolvedValue([{ status }]);
      fake.returning.mockResolvedValue([{ id }]);
      await expect(
        updatePage(asMockDatabase(fake), { id, status }, cache()),
      ).resolves.toMatchObject({ id });
      expect(fake.set).toHaveBeenCalledWith(
        expect.objectContaining({ status }),
      );
    },
  );
  it.each([
    {
      current: null,
      target: PageStatus.PUBLISHED,
      code: "PAGE_NOT_FOUND",
      message: "页面不存在",
    },
    {
      current: "UNKNOWN",
      target: PageStatus.PUBLISHED,
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      current: "UNKNOWN",
      target: PageStatus.DRAFT,
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      current: PageStatus.TO_AUDIT,
      target: PageStatus.DRAFT,
      code: "INVALID_STATE_TRANSITION",
      message: "只有已发布页面可以撤回",
    },
    {
      current: PageStatus.PUBLISHED,
      target: PageStatus.TO_AUDIT,
      code: "INVALID_PAGE_STATUS",
      message: `页面不支持变更为 ${PageStatus.TO_AUDIT}`,
    },
  ])(
    "rejects $current → $target before writes or invalidation",
    async ({ current, target, ...error }) => {
      const fake = createMockDb();
      fake.limit.mockResolvedValue(
        current === null ? [] : [{ status: current }],
      );
      const invalidator = cache();
      await expect(
        updatePage(asMockDatabase(fake), { id, status: target }, invalidator),
      ).rejects.toMatchObject(error);
      expect(fake.transaction).not.toHaveBeenCalled();
      expect(invalidator.invalidate).not.toHaveBeenCalled();
    },
  );
  it("does not invalidate when the status write fails", async () => {
    const fake = createMockDb();
    fake.limit.mockResolvedValue([{ status: PageStatus.DRAFT }]);
    const failure = new Error("write failed");
    fake.returning.mockRejectedValue(failure);
    const invalidator = cache();
    await expect(
      updatePage(
        asMockDatabase(fake),
        { id, status: PageStatus.PUBLISHED },
        invalidator,
      ),
    ).rejects.toBe(failure);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});
