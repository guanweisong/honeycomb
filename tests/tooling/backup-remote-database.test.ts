import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("@libsql/client/node", () => ({
  createClient: vi.fn(() => {
    throw new Error("Backup validation must not open a database");
  }),
}));

const originalArgv = process.argv;
afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
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
