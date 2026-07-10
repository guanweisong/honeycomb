import { beforeEach, describe, expect, it } from "vitest";
import { buildCategoryFilter } from "./filters";
import { createMockDb, resetMockDb } from "../../../../../../../tests/helpers/test-utils";
import { TEST_IDS } from "../../../../../../../tests/helpers/test-constants";

const mockDb = createMockDb();

describe("buildCategoryFilter", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
  });

  it("returns the category id together with child category ids", async () => {
    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce([
      { id: TEST_IDS.ID_2 },
      { id: TEST_IDS.ID_3 },
    ]);

    await expect(buildCategoryFilter(mockDb as never, TEST_IDS.ID_1)).resolves.toEqual([
      TEST_IDS.ID_1,
      TEST_IDS.ID_2,
      TEST_IDS.ID_3,
    ]);
  });

  it("returns only the category id when no children exist", async () => {
    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce([]);

    await expect(buildCategoryFilter(mockDb as never, TEST_IDS.ID_1)).resolves.toEqual([
      TEST_IDS.ID_1,
    ]);
  });
});
