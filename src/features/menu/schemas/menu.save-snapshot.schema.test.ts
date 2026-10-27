import { describe, expect, it } from "vitest";
import { MenuSaveSnapshotSchema } from "@/features/menu/schemas/menu.save-snapshot.schema";

describe("site snapshot contracts", () => {
  it("requires explicit menu revision and rejects empty replacement", () => {
    const items = [
      { id: "111111111111111111111111", type: "CUSTOM", power: 0 },
    ];
    expect(MenuSaveSnapshotSchema.safeParse({ items }).success).toBe(false);
    expect(
      MenuSaveSnapshotSchema.safeParse({ expectedVersion: 0, items }).success,
    ).toBe(true);
    expect(
      MenuSaveSnapshotSchema.safeParse({ expectedVersion: 0, items: [] })
        .success,
    ).toBe(false);
    expect(
      MenuSaveSnapshotSchema.safeParse({
        expectedVersion: 0,
        items,
        extra: true,
      }).success,
    ).toBe(false);
  });
});
