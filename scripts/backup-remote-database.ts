import { createClient } from "@libsql/client/node";
import {
  chmodSync,
  createReadStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { isAbsolute, join, resolve } from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function sha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

const output = process.argv[2];
if (!output || !isAbsolute(output)) throw new Error("An absolute backup directory is required");
const directory = resolve(output);
const repository = resolve(process.cwd());
if (directory === repository || directory.startsWith(`${repository}/`)) {
  throw new Error("Backup directory must be outside the repository");
}

mkdirSync(directory, { recursive: true, mode: 0o700 });
chmodSync(directory, 0o700);
const directoryStat = lstatSync(directory);
if (directoryStat.isSymbolicLink()) throw new Error("Backup directory must not be a symlink");
if (typeof process.getuid === "function" && directoryStat.uid !== process.getuid()) {
  throw new Error("Backup directory must be owned by the current user");
}

const remoteUrl = required("TURSO_URL");
const databasePath = join(directory, "honeycomb.db");
if (existsSync(databasePath)) throw new Error("Backup database already exists");
const client = createClient({
  url: `file:${databasePath}`,
  syncUrl: remoteUrl,
  authToken: required("TURSO_TOKEN"),
});

try {
  const sync = await client.sync();
  const integrity = await client.execute("pragma integrity_check");
  const integrityResult = integrity.rows.map((row) => String(row.integrity_check ?? ""));
  if (integrityResult.length !== 1 || integrityResult[0] !== "ok") {
    throw new Error(`Backup integrity check failed: ${integrityResult.join(", ")}`);
  }
  const counts = Object.fromEntries(
    await Promise.all(
      ["category", "post", "page", "setting", "tag"].map(async (table) => {
        const result = await client.execute(`select count(*) as value from ${table}`);
        return [table, Number(result.rows[0]?.value ?? 0)];
      }),
    ),
  );
  client.close();

  const databaseFiles = readdirSync(directory)
    .filter((name) => name === "honeycomb.db" || name.startsWith("honeycomb.db-"))
    .sort();
  for (const name of databaseFiles) chmodSync(join(directory, name), 0o600);
  const hashes = Object.fromEntries(
    await Promise.all(databaseFiles.map(async (name) => [name, await sha256(join(directory, name))])),
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
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
  chmodSync(metadataPath, 0o600);
  process.stdout.write(`${JSON.stringify({ directory, ...metadata }, null, 2)}\n`);
} finally {
  client.close();
}
