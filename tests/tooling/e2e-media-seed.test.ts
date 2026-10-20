// @vitest-environment node
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { initializeE2ETestTarget } from "../../scripts/e2e-seed-policy";
import { seed } from "../../scripts/seed-e2e";

it("seeds the local cover as available historical media without claiming upload verification", async () => {
  const directory = mkdtempSync(join(tmpdir(), "honeycomb-media-seed-"));
  const environment = {
    E2E_SEED: "1",
    HONEYCOMB_TEST_DIR: directory,
    TURSO_URL: `file:${join(directory, "test.db")}`,
    TURSO_TOKEN: "e2e-local-only",
  };
  let client: ReturnType<typeof createClient> | undefined;
  try {
    initializeE2ETestTarget(environment);
    for (const [key, value] of Object.entries(environment))
      vi.stubEnv(key, value);
    client = createClient({ url: environment.TURSO_URL });
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    await seed();
    expect(
      (
        await client.execute(
          "SELECT id, name, url, state, verified_at, upload_key FROM media WHERE state = 'READY'",
        )
      ).rows,
    ).toEqual([
      {
        id: "000000000000000000000016",
        name: "Search cover fixture",
        url: "/logo.jpg",
        state: "READY",
        verified_at: null,
        upload_key: null,
      },
    ]);
    expect(
      (
        await client.execute(
          "SELECT cover_id FROM post WHERE id = '000000000000000000000017'",
        )
      ).rows,
    ).toEqual([{ cover_id: "000000000000000000000016" }]);
    await seed();
    expect(
      (
        await client.execute(
          "SELECT count(*) AS count FROM media WHERE state = 'READY'",
        )
      ).rows,
    ).toEqual([{ count: 1 }]);
  } finally {
    client?.close();
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
    expect(existsSync(directory)).toBe(false);
  }
});
