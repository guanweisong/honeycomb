import { describe, expect, it } from "vitest";
import { SettingPatchSchema } from "@/features/setting/schemas/setting.patch.schema";

describe("site snapshot contracts", () => {
  it("does not count expectedVersion as a setting field change", () => {
    expect(
      SettingPatchSchema.safeParse({
        id: "111111111111111111111111",
        expectedVersion: 0,
      }).success,
    ).toBe(false);
  });
});
