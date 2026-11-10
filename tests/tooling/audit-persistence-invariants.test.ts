import { createClient, type Client } from "@libsql/client/node";
import { readMigrationFiles } from "drizzle-orm/migrator";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findPersistenceInvariantViolations } from "../../scripts/audit-persistence-invariants";
import { migrateDatabase } from "../../scripts/migrate-database";

describe("persistence invariant preflight", () => {
  let client: Client;
  let directory: string;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-audit-"));
    client = createClient({ url: `file:${join(directory, "audit.db")}` });
    for (const name of readdirSync("drizzle")
      .filter((file) => /^000[0-2]_.+\.sql$/.test(file))
      .sort()) {
      await client.executeMultiple(readFileSync(join("drizzle", name), "utf8"));
    }
  });

  afterEach(() => {
    client.close();
    rmSync(directory, { recursive: true });
    expect(existsSync(directory)).toBe(false);
  });

  it("reports only table, field and count without exposing stored values", async () => {
    await client.execute(
      "insert into link (id, url, name, logo, status) values ('secret-id', 'https://secret.example.test', 'secret-name', 'https://secret.example.test/logo', 'BROKEN')",
    );
    await client.execute("insert into setting (id) values ('first')");
    await client.execute("insert into setting (id) values ('second')");

    const violations = await findPersistenceInvariantViolations(client);
    expect(violations).toEqual(
      expect.arrayContaining([
        { table: "link", field: "status", count: 1 },
        { table: "setting", field: "singleton", count: 1 },
      ]),
    );
    const output = JSON.stringify(violations);
    expect(output).not.toMatch(/secret|https|BROKEN|example/i);
  });

  it("allows an empty valid database and migration entry invokes migrate", async () => {
    const applyMigrations = vi.fn().mockResolvedValue(undefined);
    await expect(
      migrateDatabase(client, applyMigrations),
    ).resolves.toBeUndefined();
    expect(applyMigrations).toHaveBeenCalledOnce();
  });

  it("blocks migration before apply when incompatible rows exist", async () => {
    await client.execute(
      "insert into link (id, url, name, logo, status) values ('bad', 'https://bad.example.test', 'Bad', 'https://bad.example.test/logo', 'BROKEN')",
    );
    const applyMigrations = vi.fn();
    await expect(migrateDatabase(client, applyMigrations)).rejects.toThrow(
      "link.status: 1",
    );
    expect(applyMigrations).not.toHaveBeenCalled();
  });

  it("blocks an existing migration ledger that is not a prefix of reviewed migrations", async () => {
    await client.execute(
      'create table "__drizzle_migrations" (id serial primary key, hash text not null, created_at numeric)',
    );
    await client.execute(
      "insert into \"__drizzle_migrations\" (hash, created_at) values ('unrecognized-hash', 9999999999999)",
    );

    await expect(migrateDatabase(client)).rejects.toThrow(
      "Migration ledger differs at entry 1",
    );
  });

  it("upgrades an existing reviewed prefix and preserves its records on retry", async () => {
    const reviewed = readMigrationFiles({ migrationsFolder: "drizzle" });
    await client.execute(
      'create table "__drizzle_migrations" (id serial primary key, hash text not null, created_at numeric)',
    );
    for (const { hash, folderMillis } of reviewed.slice(0, 3)) {
      await client.execute({
        sql: 'insert into "__drizzle_migrations" (hash, created_at) values (?, ?)',
        args: [hash, folderMillis],
      });
    }
    await client.execute(
      "insert into link (id, url, name, logo) values ('kept', 'https://example.test/', 'Kept', 'https://example.test/logo')",
    );

    await migrateDatabase(client);
    await migrateDatabase(client);

    const ledger = await client.execute(
      'select hash, created_at from "__drizzle_migrations" order by created_at',
    );
    expect(
      ledger.rows.map(({ hash, created_at }) => [hash, created_at]),
    ).toEqual(reviewed.map(({ hash, folderMillis }) => [hash, folderMillis]));
    expect(
      (await client.execute("select id from link")).rows.map(({ id }) => id),
    ).toEqual(["kept"]);
    expect((await client.execute("pragma foreign_key_check")).rows).toEqual([]);
  });
});
