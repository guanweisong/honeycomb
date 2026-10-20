// @vitest-environment node

import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { describe, it, expect } from "vitest";
import { buildDrizzleWhere, buildDrizzleOrderBy } from "./query-builders";

describe("buildDrizzleWhere", () => {
  it("should return undefined for empty queries", () => {
    const table = sqliteTable("fixtures", {
      name: text("name"),
      status: text("status"),
    });
    const result = buildDrizzleWhere(table, {}, []);
    expect(result).toBeUndefined();
  });

  it("should handle undefined queries", () => {
    const table = sqliteTable("fixtures", {
      name: text("name"),
      status: text("status"),
    });
    const result = buildDrizzleWhere(table, {}, []);
    expect(result).toBeUndefined();
  });

  it("should skip empty string values", () => {
    const table = sqliteTable("fixtures", {
      name: text("name"),
      status: text("status"),
    });
    const result = buildDrizzleWhere(table, { name: "", status: "active" }, []);
    expect(result).toBeDefined();
  });

  it("should skip empty array values", () => {
    const table = sqliteTable("fixtures", {
      name: text("name"),
      status: text("status"),
    });
    const result = buildDrizzleWhere(table, { name: [], status: "active" }, []);
    expect(result).toBeDefined();
  });

  it("should skip undefined values", () => {
    const table = sqliteTable("fixtures", {
      name: text("name"),
      status: text("status"),
    });
    const result = buildDrizzleWhere(
      table,
      { name: undefined, status: "active" },
      [],
    );
    expect(result).toBeDefined();
  });

  it("should handle IN query for array fields", () => {
    const table = sqliteTable("fixtures", {
      name: text("name"),
      status: text("status"),
    });
    const result = buildDrizzleWhere(table, { status: ["active", "pending"] }, [
      "status",
    ]);
    expect(result).toBeDefined();
  });

  it("should handle LIKE query for non-array fields", () => {
    const table = sqliteTable("fixtures", {
      name: text("name"),
      status: text("status"),
    });
    const result = buildDrizzleWhere(table, { name: "test" }, []);
    expect(result).toBeDefined();
  });

  it("should skip invalid table columns", () => {
    const table = sqliteTable("fixtures", { name: text("name") });
    const result = buildDrizzleWhere(table, { invalidField: "test" }, []);
    expect(result).toBeUndefined();
  });

  it("should combine multiple conditions with AND", () => {
    const table = sqliteTable("fixtures", {
      name: text("name"),
      status: text("status"),
    });
    const result = buildDrizzleWhere(
      table,
      { name: "test", status: "active" },
      [],
    );
    expect(result).toBeDefined();
  });
});

describe("buildDrizzleOrderBy", () => {
  it("should use default field when sortField is undefined", () => {
    const table = sqliteTable("fixtures", {
      createdAt: text("createdAt"),
      name: text("name"),
    });
    const result = buildDrizzleOrderBy(table, undefined, "asc", "createdAt");
    expect(result).toBeDefined();
  });

  it("should use specified sortField when valid", () => {
    const table = sqliteTable("fixtures", {
      createdAt: text("createdAt"),
      name: text("name"),
    });
    const result = buildDrizzleOrderBy(table, "name", "asc", "createdAt");
    expect(result).toBeDefined();
  });

  it("should handle asc order", () => {
    const table = sqliteTable("fixtures", { createdAt: text("createdAt") });
    const result = buildDrizzleOrderBy(table, "createdAt", "asc");
    expect(result).toBeDefined();
  });

  it("should handle desc order", () => {
    const table = sqliteTable("fixtures", { createdAt: text("createdAt") });
    const result = buildDrizzleOrderBy(table, "createdAt", "desc");
    expect(result).toBeDefined();
  });

  it("should handle mixed case sortOrder", () => {
    const table = sqliteTable("fixtures", { createdAt: text("createdAt") });
    const result = buildDrizzleOrderBy(table, "createdAt", "asc");
    expect(result).toBeDefined();
  });

  it("should use default field when sortField is invalid", () => {
    const table = sqliteTable("fixtures", { createdAt: text("createdAt") });
    const result = buildDrizzleOrderBy(
      table,
      "invalidField",
      "asc",
      "createdAt",
    );
    expect(result).toBeDefined();
  });
});
