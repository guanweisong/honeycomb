// @vitest-environment node

import type { SQL } from "drizzle-orm";
import { sqliteTable, SQLiteSyncDialect, text } from "drizzle-orm/sqlite-core";
import { describe, it, expect } from "vitest";
import { buildDrizzleWhere, buildDrizzleOrderBy } from "./query-builders";

const table = sqliteTable("fixtures", {
  name: text("name"),
  status: text("status"),
  createdAt: text("created_at"),
});
const dialect = new SQLiteSyncDialect();
function compile(query: SQL | undefined) {
  if (!query) throw new Error("Expected a SQL expression");
  const { sql, params } = dialect.sqlToQuery(query);
  return { sql, params };
}

describe("buildDrizzleWhere", () => {
  it.each([
    {},
    { name: undefined },
    { name: "" },
    { name: [] },
    { unknown: "ignored" },
  ])("omits a query without usable predicates: %j", (query) =>
    expect(buildDrizzleWhere(table, query, [])).toBeUndefined(),
  );

  it.each([undefined, "", []])(
    "skips empty values without losing a valid column: %j",
    (name) => {
      expect(
        compile(
          buildDrizzleWhere(
            table,
            { name, status: "active", unknown: "ignored" },
            [],
          ),
        ),
      ).toEqual({
        sql: '"fixtures"."status" like ?',
        params: ["%active%"],
      });
    },
  );

  it("uses an IN predicate with scalar or multiple values", () => {
    expect(
      compile(
        buildDrizzleWhere(table, { status: ["active", "pending"] }, ["status"]),
      ),
    ).toEqual({
      sql: '"fixtures"."status" in (?, ?)',
      params: ["active", "pending"],
    });
    expect(
      compile(buildDrizzleWhere(table, { status: "active" }, ["status"])),
    ).toEqual({
      sql: '"fixtures"."status" in (?)',
      params: ["active"],
    });
  });

  it("uses LIKE with bound wildcard parameters rather than SQL interpolation", () => {
    expect(
      compile(buildDrizzleWhere(table, { name: "test' OR 1=1" }, [])),
    ).toEqual({
      sql: '"fixtures"."name" like ?',
      params: ["%test' OR 1=1%"],
    });
  });

  it("combines mixed predicates with AND and preserves parameter order", () => {
    expect(
      compile(
        buildDrizzleWhere(
          table,
          { name: "test", status: ["active", "pending"] },
          ["status"],
        ),
      ),
    ).toEqual({
      sql: '("fixtures"."name" like ? and "fixtures"."status" in (?, ?))',
      params: ["%test%", "active", "pending"],
    });
  });

  it("does not mistake false or zero for missing values", () => {
    expect(
      compile(buildDrizzleWhere(table, { name: 0, status: false }, [])),
    ).toEqual({
      sql: '("fixtures"."name" like ? and "fixtures"."status" like ?)',
      params: ["%0%", "%false%"],
    });
  });
});

describe("buildDrizzleOrderBy", () => {
  it.each([
    [undefined, "asc", '"fixtures"."created_at" asc'],
    ["name", "asc", '"fixtures"."name" asc'],
    ["name", "desc", '"fixtures"."name" desc'],
    ["unknown", "asc", '"fixtures"."created_at" asc'],
  ] as const)(
    "sorts by %s in %s order with a valid fallback",
    (field, order, sql) => {
      expect(compile(buildDrizzleOrderBy(table, field, order))).toEqual({
        sql,
        params: [],
      });
    },
  );

  it("uses the repository defaults when field and direction are omitted", () => {
    expect(compile(buildDrizzleOrderBy(table, undefined))).toEqual({
      sql: '"fixtures"."created_at" desc',
      params: [],
    });
  });

  it("supports a custom fallback column", () => {
    expect(
      compile(buildDrizzleOrderBy(table, "missing", "asc", "name")),
    ).toEqual({
      sql: '"fixtures"."name" asc',
      params: [],
    });
  });

  it("rejects a missing requested and fallback column", () => {
    expect(() =>
      buildDrizzleOrderBy(table, "missing", "desc", "alsoMissing"),
    ).toThrow("Invalid sort field: missing");
  });
});
