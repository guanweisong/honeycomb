import { afterEach, describe, expect, it, vi } from "vitest";
import { getRuntimeEnvironment } from "./console-options";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getRuntimeEnvironment", () => {
  it("uses NODE_ENV when it is defined", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(getRuntimeEnvironment()).toBe("test");
  });

  it("falls back to development when NODE_ENV is missing", () => {
    vi.stubEnv("NODE_ENV", undefined);
    expect(getRuntimeEnvironment()).toBe("development");
  });
});
