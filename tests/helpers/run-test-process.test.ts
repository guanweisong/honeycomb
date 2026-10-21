// @vitest-environment node
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { runTestProcess } from "./run-test-process";

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
