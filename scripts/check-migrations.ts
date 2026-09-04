import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

interface MigrationCheckInput {
  journalTags: string[];
  migrationFiles: string[];
  trackedFiles: string[];
  changedFiles: string[];
}

export function findMigrationGovernanceErrors({
  journalTags,
  migrationFiles,
  trackedFiles,
  changedFiles,
}: MigrationCheckInput): string[] {
  const errors: string[] = [];
  const migrationNames = new Set(
    migrationFiles.map((file) => basename(file, ".sql")),
  );

  for (const tag of journalTags) {
    if (!migrationNames.has(tag)) {
      errors.push(`Journal entry ${tag} has no matching migration SQL`);
    }
  }

  const tracked = new Set(trackedFiles);
  for (const file of ["drizzle/meta/_journal.json", ...migrationFiles]) {
    if (!tracked.has(file)) {
      errors.push(`${file} is not tracked by Git`);
    }
  }

  const schemaChanged = changedFiles.some((file) =>
    file.startsWith("src/packages/infrastructure/db/schema/"),
  );
  const migrationChanged = changedFiles.some((file) =>
    file.startsWith("drizzle/"),
  );
  if (schemaChanged && !migrationChanged) {
    errors.push("Database schema changed without a matching drizzle/ change");
  }

  return errors;
}

function gitLines(args: string[]): string[] {
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFiles(): string[] {
  const files = new Set([
    ...gitLines(["diff", "--name-only", "HEAD"]),
    ...gitLines(["diff", "--cached", "--name-only"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]);

  if (process.env.CI === "true") {
    const baseRef = process.env.GITHUB_BASE_REF;
    if (baseRef) {
      const mergeBase = gitLines(["merge-base", "HEAD", `origin/${baseRef}`])[0];
      if (mergeBase) {
        for (const file of gitLines(["diff", "--name-only", `${mergeBase}...HEAD`])) {
          files.add(file);
        }
      }
    } else {
      for (const file of gitLines(["diff", "--name-only", "HEAD^", "HEAD"])) {
        files.add(file);
      }
    }
  }

  return [...files];
}

function main(): void {
  const journalPath = "drizzle/meta/_journal.json";
  if (!existsSync(journalPath)) {
    throw new Error(`${journalPath} does not exist`);
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries?: Array<{ tag?: string }>;
  };
  const migrationFiles = readdirSync("drizzle")
    .filter((file) => file.endsWith(".sql"))
    .map((file) => join("drizzle", file));
  const errors = findMigrationGovernanceErrors({
    journalTags: (journal.entries ?? []).flatMap(({ tag }) => (tag ? [tag] : [])),
    migrationFiles,
    trackedFiles: gitLines(["ls-files"]),
    changedFiles: changedFiles(),
  });

  if (errors.length > 0) {
    throw new Error(`Migration governance failed:\n- ${errors.join("\n- ")}`);
  }

  process.stdout.write(
    `Migration governance passed (${migrationFiles.length} migration file).\n`,
  );
}

if (import.meta.main) {
  main();
}
