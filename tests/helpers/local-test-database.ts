import { createClient, type Client } from "@libsql/client/node";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assertOwnedDirectory(directory: string) {
  const stat = lstatSync(directory);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (process.getuid && stat.uid !== process.getuid())
  ) {
    throw new Error(
      `Test directory ownership could not be verified: ${directory}`,
    );
  }
}

/** Each callback owns one disposable file database; no inherited database URL is read. */
export async function withTestDatabase<T>(
  run: (client: Client, directory: string) => Promise<T>,
): Promise<T> {
  const directory = mkdtempSync(join(tmpdir(), "honeycomb-test-database-"));
  let client: Client | undefined;
  const cleanup = () => {
    try {
      client?.close();
      client = undefined;
    } finally {
      assertOwnedDirectory(directory);
      rmSync(directory, { recursive: true, force: true });
      if (existsSync(directory))
        throw new Error(`Test directory was not removed: ${directory}`);
    }
  };
  const handlers = (["SIGHUP", "SIGINT", "SIGTERM"] as const).map((signal) => {
    const handler = () => {
      cleanup();
      process.exit(1);
    };
    process.once(signal, handler);
    return { signal, handler };
  });
  try {
    assertOwnedDirectory(directory);
    client = createClient({
      url: `file:${join(directory, "test.db")}`,
      authToken: "test-local-only",
    });
    return await run(client, directory);
  } finally {
    try {
      cleanup();
    } finally {
      for (const { signal, handler } of handlers)
        process.removeListener(signal, handler);
    }
  }
}

/** Copy the real migration chain through an explicit inclusive journal index. */
export function prepareMigrationFolder(
  directory: string,
  through: number,
): string {
  assertOwnedDirectory(directory);
  const journal: { entries: { idx: number; tag: string }[] } = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  if (!journal.entries.some(({ idx }) => idx === through))
    throw new Error(`Unknown migration baseline: ${through}`);
  const entries = journal.entries.filter(({ idx }) => idx <= through);
  const folder = join(directory, "baseline");
  mkdirSync(join(folder, "meta"), { recursive: true });
  for (const { tag } of entries) {
    if (!/^\d{4}_[\w-]+$/.test(tag))
      throw new Error("Invalid migration filename");
    copyFileSync(join("drizzle", `${tag}.sql`), join(folder, `${tag}.sql`));
  }
  writeFileSync(
    join(folder, "meta/_journal.json"),
    JSON.stringify({ ...journal, entries }),
  );
  return folder;
}
