import { describe, expect, it } from "vitest";
import { arrayField } from "./array-field";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";

describe("array-field", () => {
  it("serializes arrays for the database driver", () => {
    const table = sqliteTable("fixture", { tags: arrayField("tags", z.string().parse) });
    expect(table.tags.mapToDriverValue(["one", "two"])).toBe('["one","two"]');
    expect(table.tags.mapToDriverValue([])).toBe("[]");
  });

  it("restores arrays from database values", () => {
    const table = sqliteTable("fixture", { scores: arrayField("scores", z.number().parse) });
    expect(table.scores.mapFromDriverValue("[1,2,3]")).toEqual([1, 2, 3]);
    expect(table.scores.mapFromDriverValue("")).toEqual([]);
    expect(() => table.scores.mapFromDriverValue('["not-a-number"]')).toThrow();
    expect(() => table.scores.mapFromDriverValue('{}')).toThrow();
  });
});
