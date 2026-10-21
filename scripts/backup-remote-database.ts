import { createClient } from "@libsql/client/node";
import {
  chmodSync,
  createReadStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { requiredEnvironmentVariable } from "./cli";
import { quoteSqliteIdentifier } from "./sqlite";

async function sha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

const output = process.argv[2];
if (!output || !isAbsolute(output))
  throw new Error("An absolute backup directory is required");
const directory = resolve(output);
const repository = resolve(process.cwd());
if (directory === repository || directory.startsWith(`${repository}/`)) {
  throw new Error("Backup directory must be outside the repository");
}

// Validate existing destinations before any permission change or file creation.
function validateDirectory(path: string): void {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink())
    throw new Error("Backup directory must not be a symlink");
  if (!stat.isDirectory())
    throw new Error("Backup destination must be a directory");
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    throw new Error("Backup directory must be owned by the current user");
  }
}

if (existsSync(directory)) validateDirectory(directory);
const realRepository = realpathSync(repository);
let existingParent = directory;
while (!existsSync(existingParent)) existingParent = dirname(existingParent);
const resolvedDestination = resolve(
  realpathSync(existingParent),
  relative(existingParent, directory),
);
if (
  resolvedDestination === realRepository ||
  resolvedDestination.startsWith(`${realRepository}/`)
) {
  throw new Error("Backup directory must be outside the repository");
}
mkdirSync(directory, { recursive: true, mode: 0o700 });
validateDirectory(directory);
// This CLI assumes no concurrent hostile directory replacement by the owner.
chmodSync(directory, 0o700);

const remoteUrl = requiredEnvironmentVariable("TURSO_URL");
const databasePath = join(directory, "honeycomb.db");
if (existsSync(databasePath)) throw new Error("Backup database already exists");
const client = createClient({
  url: `file:${databasePath}`,
  syncUrl: remoteUrl,
  authToken: requiredEnvironmentVariable("TURSO_TOKEN"),
});

try {
  const sync = await client.sync();
  const integrity = await client.execute("pragma integrity_check");
  const integrityResult = integrity.rows.map((row) =>
    String(row.integrity_check ?? ""),
  );
  if (integrityResult.length !== 1 || integrityResult[0] !== "ok") {
    throw new Error(
      `Backup integrity check failed: ${integrityResult.join(", ")}`,
    );
  }
  const tableInventory = await client.execute(
    `select name from sqlite_master
     where type = 'table'
       and name not glob 'sqlite_*'
       and name not glob '__drizzle_*'
     order by name`,
  );
  const tables = tableInventory.rows.map((row) => String(row.name));
  const counts = Object.fromEntries(
    await Promise.all(
      tables.map(async (table) => {
        const result = await client.execute(
          `select count(*) as value from ${quoteSqliteIdentifier(table)}`,
        );
        return [table, Number(result.rows[0]?.value ?? 0)];
      }),
    ),
  );
  client.close();

  const databaseFiles = readdirSync(directory)
    .filter(
      (name) => name === "honeycomb.db" || name.startsWith("honeycomb.db-"),
    )
    .sort();
  for (const name of databaseFiles) chmodSync(join(directory, name), 0o600);
  const hashes = Object.fromEntries(
    await Promise.all(
      databaseFiles.map(async (name) => [
        name,
        await sha256(join(directory, name)),
      ]),
    ),
  );
  const target = new URL(remoteUrl);
  const metadata = {
    createdAt: new Date().toISOString(),
    target: `${target.protocol}//${target.hostname}`,
    method: "libsql-embedded-replica-sync",
    sync,
    integrity: "ok",
    counts,
    hashes,
  };
  const metadataPath = join(directory, "metadata.json");
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(metadataPath, 0o600);
  process.stdout.write(
    `${JSON.stringify({ directory, ...metadata }, null, 2)}\n`,
  );
} finally {
  client.close();
}
