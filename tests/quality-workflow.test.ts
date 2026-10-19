// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";
import { z } from "zod";

import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/quality.yml"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as {
  engines: { node: string };
  packageManager: string;
  scripts: Record<string, string>;
};
const vercelJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
) as { bunVersion?: string; installCommand: string };

const jobSchema = z.object({
  "runs-on": z.string(),
  needs: z.array(z.string()).optional(),
  strategy: z
    .object({
      "fail-fast": z.boolean(),
      matrix: z.object({ shard: z.array(z.number()) }),
    })
    .optional(),
  if: z.string().optional(),
  "continue-on-error": z.boolean().optional(),
  env: z.record(z.string(), z.string()).optional(),
  steps: z.array(
    z.object({
      run: z.string().optional(),
      uses: z.string().optional(),
      with: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional(),
      if: z.string().optional(),
      "continue-on-error": z.boolean().optional(),
      env: z.record(z.string(), z.string()).optional(),
    }),
  ),
});
const ci = z
  .object({ jobs: z.record(z.string(), jobSchema) })
  .parse(parse(workflow));
const commandsFor = (job: z.infer<typeof jobSchema>) =>
  job.steps.flatMap((step) => (step.run ? [step.run] : []));

describe("quality workflow", () => {
  it("uses the repository Bun version and lockfile installation", () => {
    expect(packageJson.packageManager).toBe("bun@1.4.2");
    expect(workflow).toContain("bun-version: 1.4.2");
    expect(workflow).toContain("bun install --frozen-lockfile");
  });

  it("uses Vercel's detected Bun installer with a frozen lockfile", () => {
    expect(vercelJson.installCommand).toBe("bun install --frozen-lockfile");
    expect(vercelJson).not.toHaveProperty("bunVersion");
  });

  it("pins Vercel to the supported Node major", () => {
    expect(packageJson.engines.node).toBe("22.x");
  });

  it("keeps Turbopack analysis finite and writes static diagnostics", () => {
    expect(workflow).toContain("- run: bun run build");
    expect(workflow).toContain("- run: timeout 10m bun run analyze");
    expect(workflow).toContain("path: .next/diagnostics/analyze/");
    expect(packageJson.scripts.analyze).toBe(
      "bun next experimental-analyze --output",
    );
    expect(workflow).not.toMatch(/webpack/i);
  });

  it("keeps all blocking quality and security checks", () => {
    for (const command of [
      "bun run check-types",
      "bun run lint",
      "bun run test:unit:shard",
      "bun run test:unit:process",
      "bun run audit:production",
      "bun run db:e2e:seed",
      "bun run test:e2e:development",
      "bun run test:e2e:production",
    ]) {
      expect(workflow).toContain(command);
    }
    expect(workflow).not.toContain("bun audit --audit-level=critical");
    expect(workflow).not.toMatch(/playwright test\s+tests\/e2e\//);
  });

  it("runs exactly two coverage shards and merges with the original threshold config", () => {
    const commands = Object.values(ci.jobs).flatMap(commandsFor);
    expect(packageJson.scripts["test:unit:coverage"]).toBe(
      "vitest run --coverage",
    );
    expect(packageJson.scripts["test:unit:shard"]).toBe(
      "vitest run --config vitest.shard.config.mts --coverage --reporter=default --reporter=blob --reporter=json --outputFile.blob=unit-shard/blob.json --outputFile.json=unit-shard/results.json",
    );
    expect(packageJson.scripts["test:unit:merge"]).toBe(
      "vitest --merge-reports=unit-blobs --coverage --reporter=default --reporter=json --outputFile.json=coverage/merged-results.json",
    );
    const shards = jobSchema.parse(ci.jobs.unit_shards);
    expect(shards.strategy).toEqual({
      "fail-fast": false,
      matrix: { shard: [1, 2] },
    });
    expect(
      commandsFor(shards).filter((command) =>
        command.startsWith("bun run test:unit:shard"),
      ),
    ).toEqual(["bun run test:unit:shard --shard=${{ matrix.shard }}/2"]);
    expect(
      commands.filter((command) => command === "bun run test:unit:process"),
    ).toHaveLength(1);
    expect(commands.join("\n")).not.toMatch(
      /bun run test:unit:(?:run|coverage)\b/,
    );
    const upload = shards.steps.find(
      (step) => step.uses === "actions/upload-artifact@v4",
    );
    expect(upload?.with).toMatchObject({
      name: "unit-shard-${{ matrix.shard }}",
      path: "unit-shard/",
      "if-no-files-found": "error",
    });
    expect(upload?.if).toBeUndefined();
    const merge = jobSchema.parse(ci.jobs.unit_coverage);
    expect(merge.needs).toEqual(["unit_checks", "unit_shards"]);
    expect(merge.if).toBeUndefined();
    expect(merge["continue-on-error"]).toBeUndefined();
    const download = merge.steps.find(
      (step) => step.uses === "actions/download-artifact@v4",
    );
    expect(download?.with).toEqual({
      pattern: "unit-shard-*",
      path: "unit-artifacts",
    });
    expect(commandsFor(merge).slice(-3)).toEqual([
      "bun scripts/check-unit-shards.ts unit-artifacts unit-inventory.json unit-blobs",
      "bun run test:unit:merge",
      "bun scripts/check-unit-shards.ts --merged coverage/merged-results.json unit-inventory.json",
    ]);
    for (const step of merge.steps.filter((step) => step.run)) {
      expect(step.if).toBeUndefined();
      expect(step["continue-on-error"]).toBeUndefined();
    }
  });

  it("runs unit checks and build/E2E independently with fresh databases", () => {
    for (const name of ["unit_checks", "unit_shards", "build_e2e"]) {
      const job = jobSchema.parse(ci.jobs[name]);
      expect(job, name).toBeDefined();
      expect(job["runs-on"]).toBe("ubuntu-latest");
      expect(job.needs).toBeUndefined();
      expect(job.if).toBeUndefined();
      expect(job["continue-on-error"]).toBeUndefined();
      expect(job.env?.TURSO_URL).toMatch(/^file:\/tmp\//);
      const commands = commandsFor(job);
      expect(commands).toContain("bun install --frozen-lockfile");
      expect(commands.indexOf("bunx drizzle-kit migrate")).toBeGreaterThan(-1);
      expect(commands.indexOf("bun run db:e2e:seed")).toBeGreaterThan(
        commands.indexOf("bunx drizzle-kit migrate"),
      );
      for (const step of job.steps.filter((step) => step.run)) {
        expect(step.if).toBeUndefined();
        expect(step["continue-on-error"]).toBeUndefined();
      }
    }
    expect(commandsFor(jobSchema.parse(ci.jobs.unit_checks))).toEqual(
      expect.arrayContaining([
        "bun run check-types",
        "bun run lint",
        "bun run db:migrations:check",
        "bun run db:invariants:audit",
        "bun run test:unit:process",
        "bun run audit:production",
      ]),
    );
    expect(commandsFor(jobSchema.parse(ci.jobs.build_e2e))).toEqual(
      expect.arrayContaining([
        "bun run build",
        "timeout 10m bun run analyze",
        "bun run test:e2e:development",
        "bun run test:e2e:production",
      ]),
    );
  });

  it("keeps verify fail-closed for failed, skipped, and cancelled dependencies", () => {
    const gate = jobSchema.parse(ci.jobs.verify);
    expect(gate.needs?.slice().sort()).toEqual([
      "build_e2e",
      "specs",
      "unit_checks",
      "unit_coverage",
      "unit_shards",
    ]);
    expect(gate.if).toBe("${{ always() }}");
    expect(gate["continue-on-error"]).toBeUndefined();
    expect(gate.steps).toHaveLength(1);
    const step = jobSchema.shape.steps.element.parse(gate.steps[0]);
    expect(step.if).toBeUndefined();
    expect(step["continue-on-error"]).toBeUndefined();
    expect(step.run).toBeDefined();
    expect(step.env).toEqual({
      SPECS_RESULT: "${{ needs.specs.result }}",
      UNIT_CHECKS_RESULT: "${{ needs.unit_checks.result }}",
      BUILD_E2E_RESULT: "${{ needs.build_e2e.result }}",
      UNIT_SHARDS_RESULT: "${{ needs.unit_shards.result }}",
      UNIT_COVERAGE_RESULT: "${{ needs.unit_coverage.result }}",
    });
    const keys = Object.keys(step.env ?? {});
    const cases = keys.reduce<Record<string, string>[]>(
      (rows, key) =>
        rows.flatMap((row) =>
          ["success", "failure", "skipped", "cancelled"].map((result) => ({
            ...row,
            [key]: result,
          })),
        ),
      [{}],
    );
    for (const results of cases) {
      const result = spawnSync(
        "bash",
        ["-e", "-c", z.string().parse(step.run)],
        {
          env: { ...process.env, ...results },
          encoding: "utf8",
        },
      );
      expect(result.status === 0, JSON.stringify(results)).toBe(
        Object.values(results).every((value) => value === "success"),
      );
    }
  }, 30_000);

  it("CI selections are disjoint and together execute the complete Playwright inventory", () => {
    const suite = z.object({
      suites: z.array(z.unknown()).default([]),
      specs: z
        .array(
          z.object({
            id: z.string(),
            tests: z.array(z.object({ projectId: z.string() })),
          }),
        )
        .default([]),
    });
    const collect = (value: unknown): string[] => {
      const current = suite.parse(value);
      return [
        ...current.specs.flatMap((spec) =>
          spec.tests.map((test) => `${spec.id}:${test.projectId}`),
        ),
        ...current.suites.flatMap(collect),
      ];
    };
    const inventory = (script: string, env: Record<string, string> = {}) => {
      expect(packageJson.scripts[script]).toBeDefined();
      const result = spawnSync(
        "bun",
        ["run", script, "--list", "--reporter=json"],
        {
          cwd: process.cwd(),
          env: { ...process.env, ...env },
          encoding: "utf8",
          timeout: 30_000,
        },
      );
      expect(result.status, result.stdout + result.stderr).toBe(0);
      return collect(JSON.parse(result.stdout));
    };
    const devStep = jobSchema
      .parse(ci.jobs.build_e2e)
      .steps.find((step) => step.run === "bun run test:e2e:development");
    const productionStep = jobSchema
      .parse(ci.jobs.build_e2e)
      .steps.find((step) => step.run === "bun run test:e2e:production");
    expect(devStep?.env?.PLAYWRIGHT_USE_DEV_SERVER).toBe("1");
    expect(productionStep?.env?.PLAYWRIGHT_USE_DEV_SERVER).toBe("0");
    for (const key of [
      "PLAYWRIGHT_PORT",
      "PLAYWRIGHT_OUTPUT_DIR",
      "PLAYWRIGHT_HTML_REPORT",
    ]) {
      expect(devStep?.env?.[key]).toBeTruthy();
      expect(productionStep?.env?.[key]).toBeTruthy();
      expect(devStep?.env?.[key]).not.toBe(productionStep?.env?.[key]);
    }
    expect(devStep?.env?.PLAYWRIGHT_REUSE_EXISTING_SERVER).not.toBe("1");
    expect(productionStep?.env?.PLAYWRIGHT_REUSE_EXISTING_SERVER).not.toBe("1");
    const full = inventory("test:e2e");
    const dev = inventory("test:e2e:development", devStep?.env);
    const production = inventory("test:e2e:production", productionStep?.env);
    expect(dev.length).toBeGreaterThan(0);
    expect(production.length).toBeGreaterThan(0);
    expect(dev.filter((id) => production.includes(id))).toEqual([]);
    expect([...dev, ...production].sort()).toEqual(full.sort());
  }, 60_000);

  it("does not conditionally skip deterministic E2E inventory", () => {
    const e2eRoot = resolve(process.cwd(), "tests/e2e");
    const conditionalSkips = readdirSync(e2eRoot, { recursive: true })
      .filter(
        (path): path is string =>
          typeof path === "string" && path.endsWith(".spec.ts"),
      )
      .flatMap((path) => {
        const source = readFileSync(resolve(e2eRoot, path), "utf8");
        return /\btest\s*\.\s*(?:describe\s*\.\s*)?skip\s*\(/.test(source)
          ? [path]
          : [];
      });

    expect(conditionalSkips).toEqual([]);
  });
});
