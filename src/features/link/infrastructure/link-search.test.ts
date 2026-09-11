import { expect, it } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { createLinkRepository } from "./link-repository";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

it("searches descriptions without additionally requiring a name match and preserves status", async () => {
  const db = createMockDb();
  db.offset.mockResolvedValue([]);
  db.where.mockReturnValueOnce(db).mockResolvedValueOnce([{ count: 0 }]);
  await createLinkRepository(asMockDatabase(db)).list(
    { description: "only-description", status: ["ENABLE"] },
    "ALL",
  );
  const query = new SQLiteSyncDialect().sqlToQuery(db.where.mock.calls[0]?.[0]);
  expect(query.sql).toContain('"link"."description" like ?');
  expect(query.sql).not.toContain('"link"."name" like ?');
  expect(query.params).toContain("ENABLE");
  expect(query.params).toContain("%only-description%");
});
