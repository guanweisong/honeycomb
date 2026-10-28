import { describe, expect, it } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { readMediaByUrls } from "@/features/media/server/read-media-by-urls";
import { SQL_ID_CHUNK_SIZE } from "@/lib/db/query/parameter-limits";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

const dialect = new SQLiteSyncDialect();
describe("bounded media URL reads", () => {
  it("skips empty input without querying", async () => {
    const db = createMockDb();
    expect(
      await readMediaByUrls(
        asMockDatabase(db),
        [],
        "post.service.detail-images",
      ),
    ).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });
  it("keeps every URL while respecting the SQL binding budget", async () => {
    const db = createMockDb();
    const urls = Array.from(
      { length: SQL_ID_CHUNK_SIZE * 2 + 1 },
      (_, index) => `https://cdn.test/${index}.png`,
    );
    const results = [{ id: "first" }, { id: "second" }, { id: "third" }];
    results.forEach((row) => db.where.mockResolvedValueOnce([row]));
    expect(
      await readMediaByUrls(
        asMockDatabase(db),
        urls,
        "post.service.detail-images",
      ),
    ).toEqual(results);
    const batches = db.where.mock.calls.map(
      ([where]) => dialect.sqlToQuery(where).params,
    );
    expect(batches.map((batch) => batch.length)).toEqual([500, 500, 1]);
    expect(batches.flat()).toEqual(urls);
  });
});
