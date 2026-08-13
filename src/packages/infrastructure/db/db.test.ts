import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ kind: "client" })),
  drizzle: vi.fn(() => ({ kind: "database" })),
  getDatabaseEnv: vi.fn(() => ({
    TURSO_URL: "libsql://example.test",
    TURSO_TOKEN: "token",
  })),
}));

vi.mock("@libsql/client", () => ({ createClient: mocks.createClient }));
vi.mock("drizzle-orm/libsql/web", () => ({ drizzle: mocks.drizzle }));
vi.mock("@/env/server", () => ({ getDatabaseEnv: mocks.getDatabaseEnv }));

describe("database initialization", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createClient.mockClear();
    mocks.drizzle.mockClear();
    mocks.getDatabaseEnv.mockClear();
  });

  it("lazily creates and reuses one database instance", async () => {
    const { getDb } = await import("./db");

    const first = getDb();
    const second = getDb();

    expect(first).toBe(second);
    expect(mocks.getDatabaseEnv).toHaveBeenCalledOnce();
    expect(mocks.createClient).toHaveBeenCalledWith({
      url: "libsql://example.test",
      authToken: "token",
    });
    expect(mocks.drizzle).toHaveBeenCalledOnce();
  });
});
