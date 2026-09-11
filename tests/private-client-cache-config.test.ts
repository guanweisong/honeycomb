import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("private route client-cache configuration", () => {
  it("reuses dynamic route payloads for five minutes", () => {
    expect(nextConfig.experimental?.staleTimes?.dynamic).toBe(300);
  });
});
