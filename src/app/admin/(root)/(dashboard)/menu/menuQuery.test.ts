import { describe, expect, it } from "vitest";
import { getMenuQueryInputs } from "./menuQuery";

describe("menu query inputs", () => {
  it("preserves the collection limits and unfiltered admin menu input", () => {
    expect(getMenuQueryInputs()).toEqual({
      page: { limit: 9999 },
      category: { limit: 9999 },
      menu: undefined,
    });
  });
});
