import { describe, expect, it } from "vitest";
import { SettingAdminUpdateSchema } from "@/features/setting/schemas/setting.admin-update.schema";

describe("site snapshot contracts", () => {
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
