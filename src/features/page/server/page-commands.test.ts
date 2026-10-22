// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import * as commands from "@/features/page/server/page-commands";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.test" },
}));
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, run: () => unknown) =>
    run(),
}));
const input = {
  title: { zh: "标题", en: "Title" },
  content: { zh: "正文", en: "Content" },
  template: PageTemplate.DEFAULT,
  status: PageStatus.DRAFT,
  creationToken: "11111111-1111-4111-8111-111111111111",
};
const cache = (state: "completed" | "degraded" = "completed") => ({
  invalidate: vi.fn().mockResolvedValue({ state }),
});
describe("page transaction retries", () => {
  it("bounds retries to contention before the business callback starts", async () => {
    const fake = createMockDb();
    fake.transaction.mockRejectedValue(
      Object.assign(new Error("busy"), { code: "SQLITE_BUSY" }),
    );
    await expect(
      commands.createPage(asMockDatabase(fake), input, "author", cache()),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(fake.transaction).toHaveBeenCalledTimes(4);
    expect(fake.insert).not.toHaveBeenCalled();
  });
  it("does not retry a callback or unknown commit failure", async () => {
    const fake = createMockDb();
    fake.limit.mockResolvedValue([
      { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
    ]);
    fake.transaction.mockImplementation(async (callback) => {
      await callback(fake);
      throw Object.assign(new Error("unknown commit"), { code: "SQLITE_BUSY" });
    });
    fake.returning.mockResolvedValue([{ id: "page", version: 0 }]);
    const invalidator = cache();
    await expect(
      commands.createPage(asMockDatabase(fake), input, "author", invalidator),
    ).rejects.toThrow("unknown commit");
    expect(fake.transaction).toHaveBeenCalledOnce();
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});
