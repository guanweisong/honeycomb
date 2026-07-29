import { describe, expect, it } from "vitest";

import { getMediaQueryInput } from "./mediaQuery";

describe("media query input", () => {
  it("preserves the unpaged media index input", () => {
    expect(getMediaQueryInput()).toEqual({ limit: 99999 });
  });
});
