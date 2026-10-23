// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  statSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@libsql/client/node", () => ({ createClient }));

const originalArgv = process.argv;
afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
  createClient.mockReset();
});

async function inspectDirectory(output: string, repository: string) {
  process.argv = ["node", "backup-remote-database.ts", output];
  vi.spyOn(process, "cwd").mockReturnValue(repository);
  vi.stubEnv("TURSO_URL", "");
  vi.stubEnv("TURSO_TOKEN", "");
  return import("../../scripts/backup-remote-database");
}

describe("backup destination validation", () => {
  it("rejects a symlink before changing its target permissions", async () => {
    const temporary = mkdtempSync(join(tmpdir(), "honeycomb-backup-check-"));
    try {
      const target = join(temporary, "target");
      const link = join(temporary, "link");
      mkdirSync(target);
      chmodSync(target, 0o755);
      symlinkSync(target, link, "dir");
      await expect(
        inspectDirectory(link, join(temporary, "repo")),
      ).rejects.toThrow(/symlink/);
      expect(statSync(target).mode & 0o777).toBe(0o755);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("rejects an ancestor symlink into the repository before creating a directory", async () => {
    const temporary = mkdtempSync(join(tmpdir(), "honeycomb-backup-check-"));
    try {
      const repository = join(temporary, "repo");
      const alias = join(temporary, "alias");
      mkdirSync(repository);
      symlinkSync(repository, alias, "dir");
      await expect(
        inspectDirectory(join(alias, "backup"), repository),
      ).rejects.toThrow(/outside the repository|symlink/);
      expect(existsSync(join(repository, "backup"))).toBe(false);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });
});

describe("backup artifact lifecycle", () => {
  async function backupFixture(run: (directory: string) => Promise<void>) {
    const temporary = mkdtempSync(
      join(tmpdir(), "honeycomb-backup-lifecycle-"),
    );
    try {
      const repository = join(temporary, "repository");
      mkdirSync(repository);
      vi.spyOn(process, "cwd").mockReturnValue(repository);
      const directory = join(temporary, "backup");
      process.argv = ["node", "backup-remote-database.ts", directory];
      vi.stubEnv(
        "TURSO_URL",
        "libsql://example.invalid?token=synthetic-secret",
      );
      vi.stubEnv("TURSO_TOKEN", "synthetic-token");
      await run(directory);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
      expect(existsSync(temporary)).toBe(false);
    }
  }

  it("writes private, hashed artifacts and a redacted successful report", async () => {
    await backupFixture(async (directory) => {
      const database = join(directory, "honeycomb.db");
      const close = vi.fn();
      const statements: string[] = [];
      createClient.mockImplementation(() => ({
        sync: async () => {
          writeFileSync(database, "abc");
          writeFileSync(`${database}-wal`, "abc");
          return { frames_synced: 1 };
        },
        execute: async (sql: string) => {
          statements.push(sql);
          if (sql === "pragma integrity_check")
            return { rows: [{ integrity_check: "ok" }] };
          if (sql.includes("sqlite_master"))
            return { rows: [{ name: 'odd"table' }] };
          return { rows: [{ value: 2 }] };
        },
        close,
      }));
      const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      await import("../../scripts/backup-remote-database");
      const metadataPath = join(directory, "metadata.json");
      const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
      expect(metadata).toMatchObject({
        target: "libsql://example.invalid",
        integrity: "ok",
        counts: { 'odd"table': 2 },
        hashes: {
          "honeycomb.db":
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
          "honeycomb.db-wal":
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        },
      });
      expect(statSync(directory).mode & 0o777).toBe(0o700);
      for (const path of [database, `${database}-wal`, metadataPath])
        expect(statSync(path).mode & 0o777).toBe(0o600);
      expect(statements).toContain(
        'select count(*) as value from "odd""table"',
      );
      expect(close).toHaveBeenCalled();
      const report = stdout.mock.calls.map(([value]) => String(value)).join("");
      expect(JSON.parse(report)).toMatchObject({ directory, integrity: "ok" });
      expect(report).not.toContain("synthetic-secret");
      expect(report).not.toContain("synthetic-token");
    });
  });

  it.each(["sync", "integrity", "inventory"] as const)(
    "closes the client and does not publish success after %s fails",
    async (stage) => {
      await backupFixture(async (directory) => {
        const close = vi.fn();
        createClient.mockReturnValue({
          sync: async () => {
            if (stage === "sync") throw new Error("Synthetic sync failure");
            return {};
          },
          execute: async (sql: string) => {
            if (sql === "pragma integrity_check")
              return {
                rows: [
                  { integrity_check: stage === "integrity" ? "corrupt" : "ok" },
                ],
              };
            throw new Error("Synthetic inventory failure");
          },
          close,
        });
        const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
        await expect(
          import("../../scripts/backup-remote-database"),
        ).rejects.toThrow(
          stage === "integrity"
            ? "Backup integrity check failed"
            : `Synthetic ${stage} failure`,
        );
        expect(close).toHaveBeenCalledOnce();
        expect(existsSync(join(directory, "metadata.json"))).toBe(false);
        expect(stdout).not.toHaveBeenCalled();
      });
    },
  );
});
