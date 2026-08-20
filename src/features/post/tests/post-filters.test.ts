import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCategoryFilter } from "../post-filters";
import { createMockDb, resetMockDb } from "@tests/helpers/test-utils";
import { TEST_IDS } from "@tests/helpers/test-constants";

const mockDb = createMockDb();

describe("buildCategoryFilter", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
  });

  it("returns the category id together with child category ids", async () => {
    const repository = { categoryFilter: vi.fn().mockResolvedValue([
      TEST_IDS.ID_1, TEST_IDS.ID_2, TEST_IDS.ID_3,
    ]) };

    await expect(
      buildCategoryFilter(repository as never, TEST_IDS.ID_1),
    ).resolves.toEqual([TEST_IDS.ID_1, TEST_IDS.ID_2, TEST_IDS.ID_3]);
  });

  it("returns only the category id when no children exist", async () => {
    const repository = { categoryFilter: vi.fn().mockResolvedValue([TEST_IDS.ID_1]) };

    await expect(
      buildCategoryFilter(repository as never, TEST_IDS.ID_1),
    ).resolves.toEqual([TEST_IDS.ID_1]);
  });
});
