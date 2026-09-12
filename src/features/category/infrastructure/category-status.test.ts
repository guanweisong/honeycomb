import { expect, it } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { createCategoryRepository } from "./category-repository";

it("rejects an unknown persisted category status at the read boundary", async () => {
  const db = createMockDb();
  db.limit.mockResolvedValue([
    { id: "category", parent: null, path: "category", status: "BROKEN" },
  ]);

  await expect(
    createCategoryRepository(asMockDatabase(db)).find("category"),
  ).rejects.toThrow("Invalid stored category.status");
});
