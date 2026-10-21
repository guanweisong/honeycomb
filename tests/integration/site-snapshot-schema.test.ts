import { describe, expect, it } from "vitest";
import { MenuSaveSnapshotSchema } from "@/features/menu/schema";
import {
  SettingAdminUpdateSchema,
  SettingPatchSchema,
} from "@/features/setting/schema";

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
  it("does not count expectedVersion as a setting field change", () => {
    expect(
      SettingPatchSchema.safeParse({
        id: "111111111111111111111111",
        expectedVersion: 0,
      }).success,
    ).toBe(false);
  });
  it("requires explicit setting revision without accepting extra fields", () => {
    const fields = {
      id: "111111111111111111111111",
      siteName: {},
      siteSubName: {},
      siteSignature: {},
      siteCopyright: {},
    };
    expect(SettingAdminUpdateSchema.safeParse(fields).success).toBe(false);
    expect(
      SettingAdminUpdateSchema.safeParse({ ...fields, expectedVersion: 0 })
        .success,
    ).toBe(true);
    expect(
      SettingAdminUpdateSchema.safeParse({
        ...fields,
        expectedVersion: 0,
        extra: true,
      }).success,
    ).toBe(false);
  });
});
