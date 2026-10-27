import { beforeEach, describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import * as schema from "@/lib/db/schema";
import { createMediaRepository } from "@/features/media/server/media-repository";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: vi.fn(
    async (_name: string, _kind: string, operation: () => unknown) =>
      operation(),
  ),
}));
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.test" },
}));

describe("media repository persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("media authorization does not create provisional records", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
    await createMediaRepository(asMockDatabase(db)).authorizeUpload("author");
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("media deletion runs storage before physical row deletion in one transaction", async () => {
    const db = createMockDb();
    const { mediaRow } = await import("@tests/helpers/media-registration");
    const targets = [mediaRow()];
    db.select.mockImplementation((projection?: object) => ({
      from: (table: object) => {
        if (table === schema.user && !projection) {
          const read = createMockDb();
          read.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
          return read;
        }
        if (table === schema.media)
          return { where: vi.fn().mockResolvedValue(targets) };
        if (table === schema.post) {
          const read = createMockDb();
          read.limit.mockResolvedValue([]);
          return read;
        }
        return [];
      },
    }));
    const remove = vi.fn(async () => {
      expect(db.delete).not.toHaveBeenCalled();
    });
    await createMediaRepository(asMockDatabase(db)).deleteWithStorage(
      targets.map((row) => row.id),
      "author",
      remove,
    );
    expect(remove).toHaveBeenCalledWith(targets);
    expect(db.delete).toHaveBeenCalledWith(schema.media);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.transaction).toHaveBeenCalledOnce();
  });
});
