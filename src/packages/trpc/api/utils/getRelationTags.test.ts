import { describe, it, expect, beforeEach, vi } from "vitest";
import { getRelationTags } from "./getRelationTags";
import { TEST_IDS } from "../../../../../tests/helpers/test-constants";
import { createMockDb } from "../../../../../tests/helpers/test-utils";

// Mock database
const mockDb = createMockDb();

vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("drizzle-orm", () => ({
  inArray: vi.fn((field, values) => ({ field, values })),
}));

describe("getRelationTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array for empty ids", async () => {
    const result = await getRelationTags([]);
    expect(result).toEqual([]);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("should return empty array for undefined ids", async () => {
    const result = await getRelationTags(undefined);
    expect(result).toEqual([]);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("should query database for non-empty ids", async () => {
    const mockTags = [
      { id: TEST_IDS.ID_1, name: { en: "Tag 1", zh: "标签1" } },
      { id: TEST_IDS.ID_2, name: { en: "Tag 2", zh: "标签2" } },
    ];

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce(mockTags);

    const result = await getRelationTags([TEST_IDS.ID_1, TEST_IDS.ID_2]);

    expect(result).toEqual(mockTags);
  });

  it("should handle single tag id", async () => {
    const mockTags = [
      { id: TEST_IDS.ID_1, name: { en: "Tag 1", zh: "标签1" } },
    ];

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce(mockTags);

    const result = await getRelationTags([TEST_IDS.ID_1]);

    expect(result).toEqual(mockTags);
  });

  it("should handle empty result from database", async () => {
    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce([]);

    const result = await getRelationTags([TEST_IDS.ID_1]);

    expect(result).toEqual([]);
  });
});
