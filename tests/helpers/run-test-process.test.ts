// @vitest-environment node
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { expect, it, vi } from "vitest";
import { runTestProcess } from "@tests/helpers/run-test-process";

it.each(["node", "bun-script", "bun-binary"] as const)(
  "terminates the complete %s descendant tree on timeout",
  async (mode) => {
    const fixture = mkdtempSync(join(tmpdir(), "honeycomb-process-tree-"));
    const ready = join(fixture, "child-ready");
    const completed = join(fixture, "child-completed");
    const continueMarker = join(fixture, "allow-child-completion");
    const launcher = join(fixture, "launcher.cjs");
    const child = join(fixture, "child.cjs");
    try {
      writeFileSync(
        child,
        `
      const fs = require("node:fs");
      process.on("SIGTERM", () => {});
      fs.writeFileSync(${JSON.stringify(ready)}, "ready");
      const timer = setInterval(() => {
        if (fs.existsSync(${JSON.stringify(continueMarker)})) {
          fs.writeFileSync(${JSON.stringify(completed)}, "survived");
          clearInterval(timer);
        }
      }, 10);
    `,
      );
      const launcherSource = `#!/usr/bin/env node
      const { spawn } = require("node:child_process");
      spawn(process.execPath, [${JSON.stringify(child)}], { stdio: "ignore" });
      setInterval(() => {}, 1000);
    `;
      writeFileSync(launcher, launcherSource);
      mkdirSync(join(fixture, "node_modules/.bin"), { recursive: true });
      writeFileSync(
        join(fixture, "node_modules/.bin/fixture-cli"),
        launcherSource,
        { mode: 0o755 },
      );
      writeFileSync(
        join(fixture, "package.json"),
        JSON.stringify({
          scripts: {
            fixture: `${JSON.stringify(process.execPath)} ${JSON.stringify(launcher)}`,
          },
        }),
      );
      const command = mode === "node" ? process.execPath : "bun";
      const args =
        mode === "node"
          ? [launcher]
          : mode === "bun-script"
            ? ["run", "fixture"]
            : ["fixture-cli"];
      await expect(
        runTestProcess(command, args, { cwd: fixture, timeout: 2000 }),
      ).rejects.toMatchObject({ code: "ETIMEDOUT" });
      expect(
        existsSync(ready),
        "the descendant must have started before the deadline",
      ).toBe(true);
      writeFileSync(continueMarker, "continue only after launcher timeout");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(
        existsSync(completed),
        "a timed-out descendant must not continue after its launcher exits",
      ).toBe(false);
    } finally {
      // Let a deliberately failing mutation/reproduction exit before cleanup.
      if (!existsSync(continueMarker)) {
        writeFileSync(continueMarker, "cleanup");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      rmSync(fixture, { recursive: true, force: true });
    }
    expect(existsSync(fixture)).toBe(false);
  },
  10_000,
);

it("retains expected CLI failure diagnostics rather than treating nonzero as timeout", async () => {
  const result = await runTestProcess(
    process.execPath,
    [
      "-e",
      'console.log("stdout diagnostic"); console.error("stderr diagnostic"); process.exit(7)',
    ],
    { timeout: 1000 },
  );
  expect(result).toEqual({
    status: 7,
    signal: null,
    stdout: "stdout diagnostic\n",
    stderr: "stderr diagnostic\n",
  });
});

it("reports launch failures without waiting for the deadline", async () => {
  await expect(
    runTestProcess("/missing-synthetic-test-command", [], { timeout: 1000 }),
  ).rejects.toMatchObject({ code: "ENOENT" });
});

it("bounds collected output and stops the producer", async () => {
  await expect(
    runTestProcess(
      process.execPath,
      [
        "-e",
        'process.stdout.write("x".repeat(2 * 1024 * 1024)); setInterval(() => {}, 1000)',
      ],
      { timeout: 1000 },
    ),
  ).rejects.toMatchObject({ code: "ENOBUFS" });
});

it.each(["explicit", "inherited"] as const)(
  "isolates fixture Git writes from %s hook environment",
  async (mode) => {
    const root = mkdtempSync(join(tmpdir(), "honeycomb-git-isolation-"));
    try {
      const outer = join(root, "outer");
      const fixture = join(root, "fixture");
      const emptyHooks = join(root, "empty-hooks");
      for (const directory of [outer, fixture, emptyHooks])
        mkdirSync(directory);
      // Setup must be safe even before the helper is fixed, including in hooks.
      const cleanEnv = { ...process.env };
      for (const key of Object.keys(cleanEnv)) {
        if (key.startsWith("GIT_")) delete cleanEnv[key];
      }
      const ordinaryEnv = {
        ...cleanEnv,
        HOME: root,
        XDG_CONFIG_HOME: root,
        FIXTURE_ENV_MARKER: "preserved",
      };
      const gitOptions = [
        "-c",
        `core.hooksPath=${emptyHooks}`,
        "-c",
        "commit.gpgSign=false",
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
      ];
      const outerGit = (...args: string[]) =>
        execFileSync("git", [...gitOptions, ...args], {
          cwd: outer,
          env: ordinaryEnv,
          encoding: "utf8",
        });
      outerGit("init", "-q", `--template=${emptyHooks}`);
      writeFileSync(join(outer, "outer.txt"), "outer stays unchanged");
      outerGit("add", "outer.txt");
      outerGit("commit", "-qm", "outer baseline");
      const snapshot = () => ({
        head: outerGit("rev-parse", "HEAD"),
        index: readFileSync(join(outer, ".git/index")),
        config: readFileSync(join(outer, ".git/config")),
      });
      const before = snapshot();
      writeFileSync(join(fixture, "fixture.txt"), "fixture owns this commit");
      const hookEnv = {
        ...ordinaryEnv,
        GIT_DIR: join(outer, ".git"),
        GIT_COMMON_DIR: join(outer, ".git"),
        GIT_WORK_TREE: fixture,
        GIT_INDEX_FILE: join(outer, ".git/index"),
        GIT_TEST_SENTINEL: "must not propagate",
      };
      if (mode === "inherited") {
        for (const key of Object.keys(process.env)) {
          if (key.startsWith("GIT_")) vi.stubEnv(key, undefined);
        }
        for (const [key, value] of Object.entries(hookEnv))
          vi.stubEnv(key, value);
      }
      const result = await runTestProcess(
        process.execPath,
        [
          "-e",
          `
        const { execFileSync } = require("node:child_process");
        const git = (...args) => execFileSync("git", [
          ...${JSON.stringify(gitOptions)}, ...args
        ], { encoding: "utf8" });
        git("init", "-q", ${JSON.stringify(`--template=${emptyHooks}`)});
        git("add", "fixture.txt");
        git("commit", "-qm", "fixture commit");
        console.log(JSON.stringify({
          gitDir: git("rev-parse", "--absolute-git-dir").trim(),
          marker: process.env.FIXTURE_ENV_MARKER,
          gitEnv: Object.keys(process.env).filter(key => key.startsWith("GIT_"))
        }));
      `,
        ],
        {
          cwd: fixture,
          timeout: 5000,
          ...(mode === "explicit" ? { env: hookEnv } : {}),
        },
      );
      expect(result.status, result.stderr).toBe(0);
      expect(snapshot()).toEqual(before);
      expect(JSON.parse(result.stdout)).toEqual({
        gitDir: join(fixture, ".git"),
        marker: "preserved",
        gitEnv: [],
      });
      expect(existsSync(join(fixture, ".git/index"))).toBe(true);
    } finally {
      vi.unstubAllEnvs();
      rmSync(root, { recursive: true, force: true });
    }
    expect(existsSync(root)).toBe(false);
  },
);
