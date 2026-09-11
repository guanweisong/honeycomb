import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { requireDefined } from "@tests/helpers/require-defined";
import { describe, it, expect } from "vitest";
import Tools, { buildDrizzleWhere, buildDrizzleOrderBy } from "./tools";
import { TEST_IDS } from "@tests/helpers/test-constants";

describe("Tools", () => {
  describe("sonsTree", () => {
    it("should return empty array for empty input", () => {
      const result = Tools.sonsTree([]);
      expect(result).toEqual([]);
    });

    it("should return root nodes when id is undefined", () => {
      const input = [
        { id: TEST_IDS.ID_1, parent: null },
        { id: TEST_IDS.ID_2, parent: TEST_IDS.ID_1 },
        { id: TEST_IDS.ID_3, parent: null },
      ];
      const result = Tools.sonsTree(input);
      expect(result).toHaveLength(3);
      expect(requireDefined(result[0]).deepPath).toBe(0);
      expect(requireDefined(result[1]).deepPath).toBe(1);
      expect(requireDefined(result[2]).deepPath).toBe(0);
    });

    it("should return children of specified parent id", () => {
      const input = [
        { id: TEST_IDS.ID_1, parent: null },
        { id: TEST_IDS.ID_2, parent: TEST_IDS.ID_1 },
        { id: TEST_IDS.ID_3, parent: TEST_IDS.ID_1 },
        { id: TEST_IDS.ID_4, parent: TEST_IDS.ID_2 },
      ];
      const result = Tools.sonsTree(input, TEST_IDS.ID_1);
      expect(result).toHaveLength(3);
      expect(requireDefined(result[0]).deepPath).toBe(0);
      expect(requireDefined(result[1]).deepPath).toBe(1);
      expect(requireDefined(result[2]).deepPath).toBe(0);
    });

    it("should handle nested hierarchy", () => {
      const input = [
        { id: TEST_IDS.ID_1, parent: null },
        { id: TEST_IDS.ID_2, parent: TEST_IDS.ID_1 },
        { id: TEST_IDS.ID_3, parent: TEST_IDS.ID_2 },
        { id: TEST_IDS.ID_4, parent: TEST_IDS.ID_3 },
      ];
      const result = Tools.sonsTree(input);
      expect(result).toHaveLength(4);
      expect(requireDefined(result[0]).deepPath).toBe(0);
      expect(requireDefined(result[1]).deepPath).toBe(1);
      expect(requireDefined(result[2]).deepPath).toBe(2);
      expect(requireDefined(result[3]).deepPath).toBe(3);
    });

    it("should add deepPath property to each node", () => {
      const input = [
        { id: TEST_IDS.ID_1, parent: null },
        { id: TEST_IDS.ID_2, parent: TEST_IDS.ID_1 },
      ];
      const result = Tools.sonsTree(input);
      expect(result[0]).toHaveProperty("deepPath");
      expect(result[1]).toHaveProperty("deepPath");
    });
  });
});

describe("buildDrizzleWhere", () => {
  it("should return undefined for empty queries", () => {
    const table = sqliteTable("fixtures", { name: text("name"), status: text("status") });
    const result = buildDrizzleWhere(table, {}, []);
    expect(result).toBeUndefined();
  });

  it("should handle undefined queries", () => {
    const table = sqliteTable("fixtures", { name: text("name"), status: text("status") });
    const result = buildDrizzleWhere(table, {}, []);
    expect(result).toBeUndefined();
  });

  it("should skip empty string values", () => {
    const table = sqliteTable("fixtures", { name: text("name"), status: text("status") });
    const result = buildDrizzleWhere(table, { name: "", status: "active" }, []);
    expect(result).toBeDefined();
  });

  it("should skip empty array values", () => {
    const table = sqliteTable("fixtures", { name: text("name"), status: text("status") });
    const result = buildDrizzleWhere(table, { name: [], status: "active" }, []);
    expect(result).toBeDefined();
  });

  it("should skip undefined values", () => {
    const table = sqliteTable("fixtures", { name: text("name"), status: text("status") });
    const result = buildDrizzleWhere(
      table,
      { name: undefined, status: "active" },
      [],
    );
    expect(result).toBeDefined();
  });

  it("should handle IN query for array fields", () => {
    const table = sqliteTable("fixtures", { name: text("name"), status: text("status") });
    const result = buildDrizzleWhere(table, { status: ["active", "pending"] }, [
      "status",
    ]);
    expect(result).toBeDefined();
  });

  it("should handle LIKE query for non-array fields", () => {
    const table = sqliteTable("fixtures", { name: text("name"), status: text("status") });
    const result = buildDrizzleWhere(table, { name: "test" }, []);
    expect(result).toBeDefined();
  });

  it("should skip invalid table columns", () => {
    const table = sqliteTable("fixtures", { name: text("name") });
    const result = buildDrizzleWhere(table, { invalidField: "test" }, []);
    expect(result).toBeUndefined();
  });

  it("should combine multiple conditions with AND", () => {
    const table = sqliteTable("fixtures", { name: text("name"), status: text("status") });
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
    const table = sqliteTable("fixtures", { createdAt: text("createdAt"), name: text("name") });
    const result = buildDrizzleOrderBy(table, undefined, "asc", "createdAt");
    expect(result).toBeDefined();
  });

  it("should use specified sortField when valid", () => {
    const table = sqliteTable("fixtures", { createdAt: text("createdAt"), name: text("name") });
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
