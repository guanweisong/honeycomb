import { describe, expect, it } from "vitest";

import { assertSafeE2ESeedTarget } from "../scripts/e2e-seed-policy";

describe("E2E seed safety policy", () => {
  it("allows an explicitly enabled local file database", () => {
    expect(
      assertSafeE2ESeedTarget({
        E2E_SEED: "1",
        TURSO_URL: "file:/tmp/honeycomb-e2e.db",
      }),
    ).toBe("file:/tmp/honeycomb-e2e.db");
  });

  it("rejects missing opt-in and remote databases", () => {
    expect(() =>
      assertSafeE2ESeedTarget({ TURSO_URL: "file:/tmp/honeycomb-e2e.db" }),
    ).toThrow(/E2E_SEED/);
    expect(() =>
      assertSafeE2ESeedTarget({
        E2E_SEED: "1",
        TURSO_URL: "libsql://production.example.com",
      }),
    ).toThrow(/local file/i);
    expect(() =>
      assertSafeE2ESeedTarget({ E2E_SEED: "1" }),
    ).toThrow(/TURSO_URL/);
  });
});
