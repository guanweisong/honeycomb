import { describe, expect, it } from "vitest";
import { getDirectiveSources } from "./content-security-policy";

describe("getDirectiveSources", () => {
  it("returns only the sources for the requested CSP directive", () => {
    expect(
      getDirectiveSources(
        "default-src 'self'; connect-src 'self' https://api.example; object-src 'none'",
        "connect-src",
      ),
    ).toEqual(["'self'", "https://api.example"]);
  });

  it("returns an empty list when the directive is absent", () => {
    expect(getDirectiveSources("default-src 'self'", "connect-src")).toEqual(
      [],
    );
  });
});
