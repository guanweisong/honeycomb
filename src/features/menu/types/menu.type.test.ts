// @vitest-environment node

import { describe, expect, it } from "vitest";
import { MenuType } from "@/features/menu/types/menu.type";

describe("domain contracts", () => {
  it("preserves stable menu.type values", () => {
    expect(Object.values(MenuType)).toEqual(["CATEGORY", "PAGE", "CUSTOM"]);
  });
});
