import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("private route client-cache configuration", () => {
  it("does not apply a global dynamic stale time to authenticated routes", () => {
    const source = readFileSync("next.config.ts", "utf8");

    expect(source).not.toContain("staleTimes");
  });
});
