import { beforeEach, expect, it, vi } from "vitest";
import { UserLevel } from "@/features/user/user";
import { createMockContext, createMockDb } from "@tests/helpers/test-utils";
const mocks = vi.hoisted(() => ({
  listPageMenuOptions: vi.fn(),
  listPageSummaries: vi.fn(),
}));
vi.mock("@/features/page/server/page-queries", () => ({
  ...mocks,
  listPages: vi.fn(),
  getPage: vi.fn(),
}));
import { pageRouter } from "../router";
const db = createMockDb();
beforeEach(() => vi.clearAllMocks());
it.each(["menuOptions", "adminIndex"] as const)(
  "rejects anonymous callers before %s accesses the database",
  async (method) => {
    await expect(
      pageRouter.createCaller(createMockContext(null, db))[method]({}),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.listPageMenuOptions).not.toHaveBeenCalled();
    expect(mocks.listPageSummaries).not.toHaveBeenCalled();
  },
);
it.each([UserLevel.GUEST, UserLevel.EDITOR, UserLevel.ADMIN])(
  "applies the same published/unpublished capability boundary for %s",
  async (level) => {
    const user = { id: "reader".padEnd(24, "0"), level };
    const caller = pageRouter.createCaller(createMockContext(user, db));
    await caller.menuOptions({ limit: 100 });
    await caller.adminIndex({ limit: 100 });
    const visibility = level === UserLevel.GUEST ? "PUBLISHED_ONLY" : "ALL";
    expect(mocks.listPageMenuOptions).toHaveBeenCalledWith(
      expect.anything(),
      { page: 1, limit: 100, sortField: "updatedAt", sortOrder: "desc" },
      visibility,
    );
    expect(mocks.listPageSummaries).toHaveBeenCalledWith(
      expect.anything(),
      { page: 1, limit: 100, sortField: "updatedAt", sortOrder: "desc" },
      visibility,
    );
  },
);
