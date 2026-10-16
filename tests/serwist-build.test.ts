import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker build mode", () => {
  it.each(["production", "development"])(
    "bundles the actual worker in %s mode regardless of the parent environment",
    async (mode) => {
      const directory = await mkdtemp(join(tmpdir(), "honeycomb-worker-"));
      try {
        for (const path of [
          "src",
          "scripts",
          "node_modules",
          "tsconfig.json",
        ]) {
          await symlink(join(process.cwd(), path), join(directory, path));
        }
        await mkdir(join(directory, "public"));
        execFileSync("bun", ["scripts/build-serwist.ts", `--${mode}`], {
          cwd: directory,
          env: {
            ...process.env,
            NODE_ENV: mode === "production" ? "development" : "production",
          },
          timeout: 30_000,
          stdio: "pipe",
        });
        const worker = await readFile(
          join(directory, "public/serwist/sw.js"),
          "utf8",
        );
        const fallbackDebugMessage =
          "Using a fallback response provided by a handlerDidError plugin.";
        if (mode === "production") {
          expect(worker).not.toContain(fallbackDebugMessage);
          expect(worker).toContain("/en/offline");
        } else {
          expect(worker).toContain(fallbackDebugMessage);
          expect(worker).toContain("precacheEntries: undefined");
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
    30_000,
  );
});
