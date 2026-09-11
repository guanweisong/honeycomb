import { spawnSync } from "node:child_process";

function git(args: string[], input?: string) {
  return spawnSync("git", args, { encoding: "utf8", input });
}

function check(args: string[]) {
  const result = git(["diff", "--no-ext-diff", "--check", ...args]);
  if (result.status !== 0) {
    process.stderr.write(result.stdout + result.stderr);
    process.exit(result.status ?? 1);
  }
}

// Keep local unstaged/staged checks; CI additionally checks committed changes.
check([]);
check(["--cached"]);
const requestedBase = process.env.QUALITY_DIFF_BASE_SHA;
if (requestedBase !== undefined || process.env.CI === "true") {
  const validSha =
    /^[a-fA-F0-9]{40}$/.test(requestedBase ?? "") &&
    !/^0+$/.test(requestedBase ?? "");
  const resolved = validSha
    ? git(["rev-parse", "--verify", `${requestedBase}^{commit}`])
    : undefined;
  // New branches, missing history and invalid input are checked conservatively
  // against the empty tree, never silently reduced to an empty local diff.
  const base =
    resolved?.status === 0
      ? resolved.stdout.trim()
      : git(["hash-object", "-t", "tree", "--stdin"], "").stdout.trim();
  if (!/^[a-fA-F0-9]{40}$/.test(base)) {
    throw new Error("Unable to resolve a safe whitespace-check base");
  }
  check([base, "HEAD", "--"]);
}
