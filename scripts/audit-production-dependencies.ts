import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { satisfies } from "semver";

export type AuditSeverity = "low" | "moderate" | "high" | "critical";

export interface AuditFinding {
  advisory: string;
  dependencyPath: string;
  packageName: string;
  severity: AuditSeverity;
  title: string;
}

export interface AuditException {
  advisory: string;
  dependencyPath: string;
  mitigation: string;
  owner: string;
  expiresOn: string;
}

interface BunAdvisory {
  url: string;
  title: string;
  severity: AuditSeverity;
  vulnerable_versions: string;
}

type BunAuditOutput = Record<string, BunAdvisory[]>;

interface LockMetadata {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalPeers?: string[];
}

type LockPackage = [string, string, LockMetadata?, string?];

interface BunLock {
  workspaces: {
    "": {
      dependencies?: Record<string, string>;
    };
  };
  packages: Record<string, LockPackage>;
}

const blockingSeverities = new Set<AuditSeverity>(["high", "critical"]);
const advisoryPattern = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function validateExceptions(exceptions: AuditException[]): void {
  for (const exception of exceptions) {
    if (!advisoryPattern.test(exception.advisory)) {
      throw new Error(`Invalid or wildcard advisory: ${exception.advisory}`);
    }
    if (
      !exception.dependencyPath ||
      exception.dependencyPath.includes("*") ||
      !exception.dependencyPath.includes(">")
    ) {
      throw new Error(
        `Invalid or wildcard dependency path: ${exception.dependencyPath}`,
      );
    }
    if (!exception.owner.trim() || !exception.mitigation.trim()) {
      throw new Error(`Exception ${exception.advisory} lacks owner or mitigation`);
    }
    if (
      !datePattern.test(exception.expiresOn) ||
      Number.isNaN(Date.parse(`${exception.expiresOn}T00:00:00Z`))
    ) {
      throw new Error(`Exception ${exception.advisory} has an invalid expiry`);
    }
  }
}

export function evaluateAudit(
  findings: AuditFinding[],
  exceptions: AuditException[],
  today: string,
): { blocking: AuditFinding[]; accepted: AuditFinding[] } {
  validateExceptions(exceptions);
  const relevant = findings.filter(({ severity }) =>
    blockingSeverities.has(severity),
  );
  const accepted: AuditFinding[] = [];
  const blocking = relevant.filter((finding) => {
    const exception = exceptions.find(
      (candidate) =>
        candidate.advisory === finding.advisory &&
        candidate.dependencyPath === finding.dependencyPath &&
        candidate.expiresOn >= today,
    );
    if (exception) {
      accepted.push(finding);
      return false;
    }
    return true;
  });

  return { blocking, accepted };
}

function stripTrailingCommas(value: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }
    if (character === ",") {
      let lookahead = index + 1;
      while (/\s/.test(value[lookahead] ?? "")) lookahead += 1;
      if (value[lookahead] === "}" || value[lookahead] === "]") continue;
    }
    result += character;
  }

  return result;
}

function parseBunLock(path: string): BunLock {
  const parsed: unknown = JSON.parse(
    stripTrailingCommas(readFileSync(path, "utf8")),
  );
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("workspaces" in parsed) ||
    !("packages" in parsed)
  ) {
    throw new Error("bun.lock has an unsupported structure");
  }
  return parsed as BunLock;
}

function packageIdentity(specifier: string): { name: string; version: string } {
  const separator = specifier.lastIndexOf("@");
  if (separator <= 0) throw new Error(`Invalid lock package: ${specifier}`);
  return {
    name: specifier.slice(0, separator),
    version: specifier.slice(separator + 1),
  };
}

function parentKey(key: string, packageName: string): string | undefined {
  if (key === packageName) return undefined;
  const suffix = `/${packageName}`;
  return key.endsWith(suffix) ? key.slice(0, -suffix.length) : undefined;
}

function resolveDependencyKey(
  packages: Record<string, LockPackage>,
  fromKey: string,
  dependencyName: string,
): string | undefined {
  let cursor: string | undefined = fromKey;
  while (cursor) {
    const nested = `${cursor}/${dependencyName}`;
    if (packages[nested]) return nested;
    const current = packages[cursor];
    if (!current) break;
    cursor = parentKey(cursor, packageIdentity(current[0]).name);
  }
  return packages[dependencyName] ? dependencyName : undefined;
}

function productionPackagePaths(lock: BunLock): Map<string, string> {
  const paths = new Map<string, string>();
  const queue: string[] = [];

  for (const dependencyName of Object.keys(
    lock.workspaces[""].dependencies ?? {},
  )) {
    if (lock.packages[dependencyName]) {
      const identity = packageIdentity(lock.packages[dependencyName][0]);
      paths.set(dependencyName, `${identity.name}@${identity.version}`);
      queue.push(dependencyName);
    }
  }

  for (let index = 0; index < queue.length; index += 1) {
    const key = queue[index];
    const [, , metadata = {}] = lock.packages[key];
    const optionalPeers = new Set(metadata.optionalPeers ?? []);
    const dependencies = {
      ...metadata.dependencies,
      ...metadata.optionalDependencies,
      ...Object.fromEntries(
        Object.entries(metadata.peerDependencies ?? {}).filter(
          ([name]) => !optionalPeers.has(name),
        ),
      ),
    };

    for (const dependencyName of Object.keys(dependencies)) {
      const dependencyKey = resolveDependencyKey(
        lock.packages,
        key,
        dependencyName,
      );
      if (!dependencyKey || paths.has(dependencyKey)) continue;
      const identity = packageIdentity(lock.packages[dependencyKey][0]);
      paths.set(
        dependencyKey,
        `${paths.get(key)}>${identity.name}@${identity.version}`,
      );
      queue.push(dependencyKey);
    }
  }

  return paths;
}

function advisoryId(url: string): string {
  const id = basename(new URL(url).pathname);
  if (!advisoryPattern.test(id)) {
    throw new Error(`Unsupported advisory URL: ${url}`);
  }
  return id;
}

export function createProductionFindings(
  audit: BunAuditOutput,
  lock: BunLock,
): AuditFinding[] {
  const paths = productionPackagePaths(lock);
  const findings: AuditFinding[] = [];

  for (const [key, dependencyPath] of paths) {
    const { name, version } = packageIdentity(lock.packages[key][0]);
    for (const advisory of audit[name] ?? []) {
      if (!satisfies(version, advisory.vulnerable_versions)) continue;
      findings.push({
        advisory: advisoryId(advisory.url),
        dependencyPath,
        packageName: name,
        severity: advisory.severity,
        title: advisory.title,
      });
    }
  }

  return findings.sort((left, right) =>
    `${left.advisory}:${left.dependencyPath}`.localeCompare(
      `${right.advisory}:${right.dependencyPath}`,
    ),
  );
}

function runBunAudit(): BunAuditOutput {
  const result = spawnSync("bun", ["audit", "--json"], {
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`bun audit failed: ${result.stderr.trim()}`);
  }
  try {
    return JSON.parse(result.stdout) as BunAuditOutput;
  } catch {
    throw new Error("bun audit returned invalid JSON");
  }
}

function argumentValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function main(): void {
  const today = new Date().toISOString().slice(0, 10);
  const audit = runBunAudit();
  const lock = parseBunLock("bun.lock");
  const exceptions = JSON.parse(
    readFileSync("scripts/dependency-audit-exceptions.json", "utf8"),
  ) as AuditException[];
  const findings = createProductionFindings(audit, lock);
  const result = evaluateAudit(findings, exceptions, today);
  const report = { generatedOn: today, findings, ...result };
  const output = argumentValue("--output");
  if (output) writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

  for (const finding of result.accepted) {
    const exception = exceptions.find(
      ({ advisory, dependencyPath }) =>
        advisory === finding.advisory &&
        dependencyPath === finding.dependencyPath,
    );
    process.stdout.write(
      `EXCEPTED ${finding.advisory} ${finding.dependencyPath} until ${exception?.expiresOn}\n`,
    );
  }
  if (result.blocking.length > 0) {
    const details = result.blocking
      .map(
        (finding) =>
          `${finding.severity.toUpperCase()} ${finding.advisory} ${finding.dependencyPath}`,
      )
      .join("\n");
    throw new Error(`Unexcepted production dependency findings:\n${details}`);
  }
  process.stdout.write(
    `Production audit passed (${findings.length} findings, ${result.accepted.length} exceptions).\n`,
  );
}

if (import.meta.main) main();
