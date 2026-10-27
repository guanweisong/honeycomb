import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { describe, expect, it } from "vitest";
import { MenuWriteSchema as MenuUpdateSchema } from "@/features/menu/schemas/menu.write.schema";
import { saveAllMenus } from "@/features/menu/server/menu-commands";

describe("bounded write contracts", () => {
  it("rejects implicit menu clearing at both entry points", async () => {
    expect(MenuUpdateSchema.safeParse([]).success).toBe(false);
    const invalidator = {
      invalidate: async () => ({ state: "completed" as const }),
    };
    await expect(
      saveAllMenus(
        asMockDatabase(createMockDb()),
        { expectedVersion: 0, items: [] },
        "author",
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
