import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { createPage, destroyPages } from "./page-commands";
import { PageTemplate } from "../types/page.template";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import * as schema from "@/lib/db/schema";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));

describe("feature persistence contracts", () => {
  const invalidator = () => ({
    invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
  });
  it("page writes preserve author identity and localized content", async () => {
    const db = createMockDb();
    const id = "507f1f77bcf86cd799439011";
    db.returning.mockResolvedValue([{ id, version: 0 }]);
    db.from.mockImplementation((table: object) => {
      const read = createMockDb();
      read.limit.mockResolvedValue(
        table === schema.user
          ? [{ level: UserLevel.ADMIN, status: UserStatus.ENABLE }]
          : table === schema.page
            ? [{ id, version: 0 }]
            : [],
      );
      return read;
    });
    const input = {
      creationToken: "11111111-1111-4111-8111-111111111111",
      title: { en: "About", zh: "关于" },
      content: { en: "Content", zh: "内容" },
      template: PageTemplate.DEFAULT,
    };
    await expect(
      createPage(asMockDatabase(db), input, "user-1", invalidator()),
    ).resolves.toEqual({ id, version: 0, publicSync: "completed" });
    await expect(
      destroyPages(
        asMockDatabase(db),
        { items: [{ id, expectedVersion: 0 }] },
        "user-1",
        invalidator(),
      ),
    ).resolves.toMatchObject({ success: true });
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-1",
        template: PageTemplate.DEFAULT,
      }),
    );
    expect(db.insert).toHaveBeenCalledWith(schema.pageTranslation);
    expect(db.delete).toHaveBeenCalledWith(schema.page);
  });
});
