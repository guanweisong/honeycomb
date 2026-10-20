import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

type TestEnvironment = Readonly<Record<string, string | undefined>>;
const marker = ".honeycomb-test-target";
export const E2E_TEST_TOKEN = "e2e-local-only";

function ownedTarget(environment: TestEnvironment): {
  directory: string;
  url: string;
  path: string;
} {
  if (environment.E2E_SEED !== "1")
    throw new Error("E2E_SEED=1 is required for test database access");
  const url = environment.TURSO_URL;
  if (!url) throw new Error("TURSO_URL is required for test database access");
  if (
    !url.startsWith("file:/") ||
    url.startsWith("file://") ||
    url.includes("%") ||
    url.includes("?") ||
    url.includes("#")
  ) {
    throw new Error("Test target must be an absolute local file database");
  }
  const directory = environment.HONEYCOMB_TEST_DIR;
  const path = url.slice(5);
  if (
    !directory ||
    !isAbsolute(directory) ||
    resolve(directory) !== directory ||
    resolve(path) !== path ||
    dirname(path) !== directory ||
    path !== join(directory, "test.db")
  ) {
    throw new Error(
      "Test target must be inside its explicit exclusive temporary directory",
    );
  }
  const stat = lstatSync(directory);
  const temporaryRoot = realpathSync(tmpdir());
  const temporaryRelative = relative(temporaryRoot, directory);
  const repositoryRelative = relative(realpathSync(process.cwd()), directory);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    realpathSync(directory) !== directory ||
    stat.uid !== process.getuid?.() ||
    (stat.mode & 0o077) !== 0 ||
    temporaryRelative.startsWith(`..${sep}`) ||
    isAbsolute(temporaryRelative) ||
    (!repositoryRelative.startsWith(`..${sep}`) &&
      !isAbsolute(repositoryRelative))
  ) {
    throw new Error(
      "Test directory must be private, owned, canonical, temporary and outside the repository",
    );
  }
  if (environment.TURSO_TOKEN !== E2E_TEST_TOKEN)
    throw new Error("Test database requires sentinel credentials");
  return { directory, url, path };
}

/** Register once, before any database exists. Never adopts an existing directory's data. */
export function initializeE2ETestTarget(environment: TestEnvironment): void {
  const { directory, url } = ownedTarget(environment);
  if (readdirSync(directory).length !== 0)
    throw new Error("Test directory must be fresh and empty");
  writeFileSync(join(directory, marker), url, { flag: "wx", mode: 0o600 });
}

export function assertSafeE2ESeedTarget(environment: TestEnvironment): string {
  const { directory, url, path } = ownedTarget(environment);
  const proof = join(directory, marker);
  if (
    !lstatSync(proof).isFile() ||
    lstatSync(proof).isSymbolicLink() ||
    readFileSync(proof, "utf8") !== url
  )
    throw new Error("Test directory has no matching ownership proof");
  for (const name of [path, `${path}-wal`, `${path}-shm`, `${path}-journal`]) {
    try {
      const stat = lstatSync(name);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.uid !== process.getuid?.() ||
        stat.nlink !== 1
      )
        throw new Error("Unsafe test database file");
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
  }
  return url;
}

/** Refuse rather than reload credentials after the server command unsets them. */
export function assertNoE2EDotenvFiles(directory: string): void {
  const files = readdirSync(directory).filter((name) =>
    /^\.env(?:\.(?:local|development|production|test)(?:\.local)?)?$/.test(
      name,
    ),
  );
  if (files.length > 0)
    throw new Error(
      `Isolated E2E startup refuses dotenv files: ${files.join(", ")}. Use a clean checkout without dotenv files; do not move or delete existing credentials.`,
    );
}

// Keep this module importable by Playwright's CommonJS config loader.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve("scripts/e2e-seed-policy.ts")
) {
  if (process.argv.includes("--initialize"))
    initializeE2ETestTarget(process.env);
  else {
    assertSafeE2ESeedTarget(process.env);
    if (process.argv.includes("--server"))
      assertNoE2EDotenvFiles(process.cwd());
  }
}
