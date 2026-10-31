// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { runTestProcess } from "@tests/helpers/run-test-process";
import { parse } from "yaml";
import { z } from "zod";

import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/quality.yml"),
  "utf8",
);
const fullWorkflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/quality-full.yml"),
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
  if: z.string().optional(),
  "continue-on-error": z.boolean().optional(),
  env: z.record(z.string(), z.string()).optional(),
  steps: z.array(
    z.object({
      run: z.string().optional(),
      if: z.string().optional(),
      "continue-on-error": z.boolean().optional(),
      env: z.record(z.string(), z.string()).optional(),
    }),
  ),
});
const ci = z
  .object({ jobs: z.record(z.string(), jobSchema) })
  .parse(parse(workflow));
const fullCi = z
  .object({ jobs: z.record(z.string(), jobSchema) })
  .parse(parse(fullWorkflow));
const commandsFor = (job: z.infer<typeof jobSchema>) =>
  job.steps.flatMap((step) =>
    step.run
      ? step.run
          .trim()
          .split("\n")
          .map((line) => line.trim().replace(/^phase "[^"]+" (?:env )?/, ""))
      : [],
  );

describe("quality workflow", () => {
  it("uses the repository Bun version and lockfile installation", () => {
    expect(packageJson.packageManager).toBe("bun@1.4.4");
    expect(workflow.match(/bun-version: 1\.4\.4/g)).toHaveLength(7);
    expect(fullWorkflow.match(/bun-version: 1\.4\.4/g)).toHaveLength(5);
    expect(workflow).toContain("bun install --frozen-lockfile");
    expect(fullWorkflow).toContain("bun install --frozen-lockfile");
  });

  it("uses Vercel's detected Bun installer with a frozen lockfile", () => {
    expect(vercelJson.installCommand).toBe("bun install --frozen-lockfile");
    expect(vercelJson).not.toHaveProperty("bunVersion");
  });

  it("pins the supported Node major and development minimum", () => {
    expect(packageJson.engines.node).toBe(">=24.15.0 <25");
    expect(workflow.match(/node-version: 24\.22\.1/g)).toHaveLength(6);
    expect(fullWorkflow.match(/node-version: 24\.22\.1/g)).toHaveLength(5);
  });

  it("keeps Turbopack analysis finite and writes static diagnostics", () => {
    expect(workflow).toContain("bun run build");
    expect(fullWorkflow).toContain("timeout 10m bun run analyze");
    expect(fullWorkflow).toContain("path: .next/diagnostics/analyze/");
    expect(packageJson.scripts.analyze).toBe(
      "bun next experimental-analyze --output",
    );
    expect(`${workflow}\n${fullWorkflow}`).not.toMatch(/webpack/i);
  });

  it("keeps all blocking quality and security checks", () => {
    for (const command of [
      "bun run check-types",
      "bun run lint",
      "bun run test:unit:run tests/tooling/quality-workflow.test.ts",
      "bun run test:unit:coverage",
      "bun run test:unit:process",
      "bun run audit:production",
      "bun run db:e2e:seed",
      "bun run test:e2e:development",
      "bun run test:e2e:production",
    ]) {
      expect(`${workflow}\n${fullWorkflow}`).toContain(command);
    }
    expect(workflow).not.toContain("bun audit --audit-level=critical");
    expect(`${workflow}\n${fullWorkflow}`).not.toMatch(
      /playwright test\s+tests\/e2e\//,
    );
    expect(fullWorkflow).toContain('cron: "0 18 * * *"');
    expect(fullWorkflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("test:unit:coverage");
    expect(workflow).not.toContain("bun run analyze");
    const classifier = readFileSync(
      resolve(process.cwd(), "scripts/classify-quality-changes.sh"),
      "utf8",
    );
    for (const path of [
      "scripts/classify-quality-changes.sh",
      ".github/workflows/quality*.yml",
      "src/app/admin/*",
      "src/features/*/*router.ts",
      "src/proxy.ts",
      "src/lib/http/client-ip.ts",
      "next.config.ts",
      "src/lib/auth/*",
      "src/lib/security/*",
      "src/lib/db/*",
      "src/lib/rate-limit/*",
      "src/features/*/server/*",
      "src/features/media/*",
      "src/lib/storage/*",
      "src/app/pwa/*",
      "tests/e2e/*",
    ]) {
      expect(classifier).toContain(path);
    }
    expect(workflow).toContain("needs.specs.outputs.high_risk == 'true'");
    expect(workflow).toContain(
      "needs.specs.outputs.requires_production_e2e == 'true'",
    );
  });

  it("retains the complete dependency audit report even on a failing gate", () => {
    expect(workflow).toContain(
      "bun run audit:production --output dependency-audit-report.json",
    );
    const parsed = z
      .object({
        jobs: z.object({
          unit_checks: z.object({
            steps: z.array(
              z.object({
                uses: z.string().optional(),
                if: z.string().optional(),
                with: z
                  .object({
                    name: z.string().optional(),
                    path: z.string().optional(),
                  })
                  .optional(),
              }),
            ),
          }),
        }),
      })
      .parse(parse(workflow));
    expect(parsed.jobs.unit_checks.steps).toContainEqual(
      expect.objectContaining({
        uses: "actions/upload-artifact@v4",
        if: "always()",
        with: expect.objectContaining({
          name: "production-dependency-audit",
          path: "dependency-audit-report.json",
        }),
      }),
    );
  });

  it("runs the full unit inventory once with coverage and retains process tests", () => {
    const commands = [
      ...Object.values(ci.jobs),
      ...Object.values(fullCi.jobs),
    ].flatMap(commandsFor);

    expect(packageJson.scripts["test:unit:coverage"]).toBe(
      "vitest run --coverage",
    );
    expect(packageJson.scripts["test:unit:process"]).toBe(
      "vitest run --config vitest.process.config.mts",
    );
    expect(
      commands.filter((command) =>
        command.startsWith("bun run test:unit:coverage --shard="),
      ),
    ).toHaveLength(1);
    expect(
      commands.filter((command) => command === "bun run test:unit:process"),
    ).toHaveLength(1);
    expect(commands.join("\n")).toMatch(/bun run test:unit:run\b/);
    expect(commands.join("\n")).not.toMatch(/test:unit:coverage.*--changed/);
  });

  it("runs PR test lanes with isolated databases and keeps production build independent", () => {
    for (const name of [
      "unit_checks",
      "feature_tests",
      "high_risk_unit_tests",
      "high_risk_development_e2e",
      "high_risk_production_e2e",
      "production_build",
    ]) {
      const job = jobSchema.parse(ci.jobs[name]);
      expect(job, name).toBeDefined();
      expect(job["runs-on"]).toBe("ubuntu-latest");
      if (name === "unit_checks" || name === "production_build") {
        expect(job.needs).toBeUndefined();
        expect(job.if).toBeUndefined();
      } else {
        expect(job.needs).toContain("specs");
        expect(job.if).toBeDefined();
      }
      expect(job["continue-on-error"]).toBeUndefined();
      expect(job.env?.TURSO_URL).toBeUndefined();
      const script = commandsFor(job).join("\n");
      expect(script).toContain("mktemp -d");
      expect(script).toContain("source scripts/ci-fixture-lifecycle.sh");
      expect(
        script.indexOf("source scripts/ci-fixture-lifecycle.sh"),
      ).toBeGreaterThan(script.indexOf("mktemp -d"));
      expect(
        script.indexOf("source scripts/ci-fixture-lifecycle.sh"),
      ).toBeLessThan(script.indexOf("export TURSO_URL"));
      expect(script).toContain(
        'export TURSO_URL="file:${HONEYCOMB_TEST_DIR}/test.db"',
      );
      expect(script).toContain("export TURSO_TOKEN=e2e-local-only");
      expect(script.indexOf("--initialize")).toBeLessThan(
        script.indexOf("bun run db:migrate"),
      );
      expect(script).not.toContain("honeycomb-ci.db");
      const commands = commandsFor(job);
      expect(commands).toContain("bun install --frozen-lockfile");
      expect(commands.indexOf("bun run db:migrate")).toBeGreaterThan(-1);
      expect(commands.indexOf("bun run db:e2e:seed")).toBeGreaterThan(
        commands.indexOf("bun run db:migrate"),
      );
      for (const step of job.steps.filter((step) => step.run)) {
        expect(step.if).toBeUndefined();
        expect(step["continue-on-error"]).toBeUndefined();
      }
    }
    const productionBuild = jobSchema.parse(ci.jobs.production_build);
    expect(commandsFor(productionBuild)).toContain("bun run build");
    expect(commandsFor(productionBuild).join("\n")).not.toMatch(
      /analyze|test:e2e/,
    );
    expect(commandsFor(jobSchema.parse(ci.jobs.unit_checks))).toEqual(
      expect.arrayContaining([
        "bun run check-types",
        "bun run lint",
        "bun run db:migrations:check",
        "bun run db:invariants:audit",
        "bun run test:unit:process",
        "bun run audit:production --output dependency-audit-report.json",
      ]),
    );
    expect(commandsFor(jobSchema.parse(ci.jobs.feature_tests))).toContain(
      'bun run test:unit:run --changed="$QUALITY_DIFF_BASE_SHA"',
    );
    expect(
      commandsFor(jobSchema.parse(ci.jobs.high_risk_unit_tests)),
    ).toContain("bun run test:unit:run");
    expect(
      commandsFor(jobSchema.parse(ci.jobs.high_risk_development_e2e)),
    ).toContain(
      "PLAYWRIGHT_USE_DEV_SERVER=1 PLAYWRIGHT_PORT=3100 bun run test:e2e:development",
    );
    expect(
      commandsFor(jobSchema.parse(ci.jobs.high_risk_production_e2e)),
    ).toContain(
      "PLAYWRIGHT_USE_DEV_SERVER=0 PLAYWRIGHT_PORT=3101 bun run test:e2e:production",
    );
    for (const name of [
      "unit_coverage",
      "development_e2e",
      "production_e2e",
      "bundle_analysis",
    ]) {
      const job = jobSchema.parse(fullCi.jobs[name]);
      const script = commandsFor(job).join("\n");
      expect(job.env?.TURSO_URL).toBeUndefined();
      expect(script).toContain("mktemp -d");
      expect(script).toContain("source scripts/ci-fixture-lifecycle.sh");
      expect(script).toContain(
        'export TURSO_URL="file:${HONEYCOMB_TEST_DIR}/test.db"',
      );
      expect(script).toContain("export TURSO_TOKEN=e2e-local-only");
      expect(script.indexOf("--initialize")).toBeLessThan(
        script.indexOf("bun run db:migrate"),
      );
      expect(script.indexOf("bun run db:e2e:seed")).toBeGreaterThan(
        script.indexOf("bun run db:migrate"),
      );
    }
  });

  it("shards coverage without dropping tests or weakening the merged gate", () => {
    const raw = parse(fullWorkflow) as {
      jobs: Record<string, { strategy?: unknown; steps: unknown[] }>;
    };
    expect(raw.jobs.unit_coverage?.strategy).toEqual({
      "fail-fast": false,
      matrix: { shard: [1, 2] },
    });
    const shard = commandsFor(jobSchema.parse(fullCi.jobs.unit_coverage)).join(
      "\n",
    );
    expect(shard).toContain(
      "bun run test:unit:coverage --shard=${{ matrix.shard }}/2 --reporter=default --reporter=blob",
    );
    expect(shard).not.toMatch(
      /thresholds|coverage\.exclude|no-coverage|passWithNoTests/,
    );
    const merge = jobSchema.parse(fullCi.jobs.coverage_gate);
    expect(merge.needs).toEqual(["unit_coverage"]);
    expect(merge["continue-on-error"]).toBeUndefined();
    const commands = commandsFor(merge).join("\n");
    expect(commands).toContain("test -s .vitest/blob/blob-1-2.json");
    expect(commands).toContain("test -s .vitest/blob/blob-2-2.json");
    expect(commands).toContain(
      "bun run test:unit:coverage --merge-reports=.vitest/blob",
    );
    expect(commands).not.toMatch(/thresholds|no-coverage/);
    expect(fullWorkflow).toContain("include-hidden-files: true");
    expect(fullWorkflow).toContain("if-no-files-found: error");
    expect(workflow).not.toContain("bun run test:unit:coverage");
    expect(workflow).not.toContain("timeout 10m bun run analyze");
  });

  it("starts high-risk development E2E without waiting for builds or analysis", () => {
    const commands = commandsFor(
      jobSchema.parse(ci.jobs.high_risk_development_e2e),
    );
    expect(commands).toContain(
      "PLAYWRIGHT_USE_DEV_SERVER=1 PLAYWRIGHT_PORT=3100 bun run test:e2e:development",
    );
    expect(commands.join("\n")).not.toMatch(/bun run (?:build|analyze)/);
    expect(workflow).toContain("path: .next/cache/turbopack");
    expect(commandsFor(jobSchema.parse(fullCi.jobs.development_e2e))).toContain(
      "PLAYWRIGHT_USE_DEV_SERVER=1 PLAYWRIGHT_PORT=3100 bun run test:e2e:development",
    );
  });

  it("times individual phases without swallowing failures", () => {
    const script = readFileSync(
      resolve("scripts/ci-fixture-lifecycle.sh"),
      "utf8",
    );
    const timer = script.match(/phase\(\) \{[\s\S]*?\n\}/)?.[0];
    expect(timer).toBeDefined();
    const result = spawnSync(
      "bash",
      [
        "-e",
        "-o",
        "pipefail",
        "-c",
        `${timer}\nphase "Expected failure" bash -c 'exit 7'\nprintf SHOULD_NOT_RUN`,
      ],
      {
        env: { ...process.env, GITHUB_STEP_SUMMARY: "" },
        encoding: "utf8",
        timeout: 5_000,
        killSignal: "SIGKILL",
      },
    );
    expect(result.status).toBe(7);
    expect(result.stdout).toContain("Expected failure");
    expect(result.stdout).toContain("exit=7");
    expect(result.stdout).not.toContain("SHOULD_NOT_RUN");
    expect(script).toContain("Fixture cleanup:");
  });

  it("keeps verify fail-closed for failed, skipped, and cancelled dependencies", () => {
    const gate = jobSchema.parse(ci.jobs.verify);
    expect(gate.needs?.slice().sort()).toEqual([
      "feature_tests",
      "high_risk_development_e2e",
      "high_risk_production_e2e",
      "high_risk_unit_tests",
      "production_build",
      "specs",
      "unit_checks",
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
      HAS_TEST_TARGETS: "${{ needs.specs.outputs.has_test_targets }}",
      HIGH_RISK: "${{ needs.specs.outputs.high_risk }}",
      REQUIRES_PRODUCTION_E2E:
        "${{ needs.specs.outputs.requires_production_e2e }}",
      UNIT_CHECKS_RESULT: "${{ needs.unit_checks.result }}",
      FEATURE_TESTS_RESULT: "${{ needs.feature_tests.result }}",
      HIGH_RISK_UNIT_RESULT: "${{ needs.high_risk_unit_tests.result }}",
      HIGH_RISK_E2E_RESULT: "${{ needs.high_risk_development_e2e.result }}",
      HIGH_RISK_PRODUCTION_E2E_RESULT:
        "${{ needs.high_risk_production_e2e.result }}",
      PRODUCTION_BUILD_RESULT: "${{ needs.production_build.result }}",
    });
    const ordinaryChange = {
      SPECS_RESULT: "success",
      HAS_TEST_TARGETS: "true",
      HIGH_RISK: "false",
      REQUIRES_PRODUCTION_E2E: "false",
      UNIT_CHECKS_RESULT: "success",
      FEATURE_TESTS_RESULT: "success",
      HIGH_RISK_UNIT_RESULT: "skipped",
      HIGH_RISK_E2E_RESULT: "skipped",
      HIGH_RISK_PRODUCTION_E2E_RESULT: "skipped",
      PRODUCTION_BUILD_RESULT: "success",
    };
    const documentationChange = {
      SPECS_RESULT: "success",
      HAS_TEST_TARGETS: "false",
      HIGH_RISK: "false",
      REQUIRES_PRODUCTION_E2E: "false",
      UNIT_CHECKS_RESULT: "success",
      FEATURE_TESTS_RESULT: "skipped",
      HIGH_RISK_UNIT_RESULT: "skipped",
      HIGH_RISK_E2E_RESULT: "skipped",
      HIGH_RISK_PRODUCTION_E2E_RESULT: "skipped",
      PRODUCTION_BUILD_RESULT: "success",
    };
    const highRiskChange = {
      SPECS_RESULT: "success",
      HAS_TEST_TARGETS: "true",
      HIGH_RISK: "true",
      REQUIRES_PRODUCTION_E2E: "false",
      UNIT_CHECKS_RESULT: "success",
      FEATURE_TESTS_RESULT: "skipped",
      HIGH_RISK_UNIT_RESULT: "success",
      HIGH_RISK_E2E_RESULT: "success",
      HIGH_RISK_PRODUCTION_E2E_RESULT: "skipped",
      PRODUCTION_BUILD_RESULT: "success",
    };
    const highRiskProductionChange = {
      SPECS_RESULT: "success",
      HAS_TEST_TARGETS: "true",
      HIGH_RISK: "true",
      REQUIRES_PRODUCTION_E2E: "true",
      UNIT_CHECKS_RESULT: "success",
      FEATURE_TESTS_RESULT: "skipped",
      HIGH_RISK_UNIT_RESULT: "success",
      HIGH_RISK_E2E_RESULT: "success",
      HIGH_RISK_PRODUCTION_E2E_RESULT: "success",
      PRODUCTION_BUILD_RESULT: "success",
    };
    const scenarios = [
      ordinaryChange,
      documentationChange,
      highRiskChange,
      highRiskProductionChange,
    ];
    for (const scenario of scenarios) {
      const result = spawnSync(
        "bash",
        ["-e", "-c", z.string().parse(step.run)],
        {
          env: { ...process.env, ...scenario },
          encoding: "utf8",
          timeout: 1_000,
          killSignal: "SIGKILL",
        },
      );
      if (result.error) throw result.error;
      expect(result.status, JSON.stringify(scenario)).toBe(0);
    }
    for (const scenario of [
      ordinaryChange,
      highRiskChange,
      highRiskProductionChange,
    ]) {
      const required = [
        "SPECS_RESULT",
        "UNIT_CHECKS_RESULT",
        "PRODUCTION_BUILD_RESULT",
        ...(scenario.HIGH_RISK === "true"
          ? ["HIGH_RISK_UNIT_RESULT", "HIGH_RISK_E2E_RESULT"]
          : ["FEATURE_TESTS_RESULT"]),
        ...(scenario.REQUIRES_PRODUCTION_E2E === "true"
          ? ["HIGH_RISK_PRODUCTION_E2E_RESULT"]
          : []),
      ];
      for (const name of required) {
        for (const status of ["failure", "skipped", "cancelled"]) {
          const result = spawnSync(
            "bash",
            ["-e", "-c", z.string().parse(step.run)],
            {
              env: { ...process.env, ...scenario, [name]: status },
              encoding: "utf8",
              timeout: 1_000,
              killSignal: "SIGKILL",
            },
          );
          if (result.error) throw result.error;
          expect(result.status, `${name}=${status}`).not.toBe(0);
        }
      }
    }
    const fullGate = jobSchema.parse(fullCi.jobs.verify);
    expect(fullGate.needs?.slice().sort()).toEqual([
      "bundle_analysis",
      "coverage_gate",
      "development_e2e",
      "production_e2e",
      "unit_coverage",
    ]);
    expect(fullGate.if).toBe("${{ always() }}");
    const fullCommands = Object.values(fullCi.jobs)
      .flatMap(commandsFor)
      .join("\n");
    expect(fullCommands).toContain(
      "PLAYWRIGHT_USE_DEV_SERVER=0 PLAYWRIGHT_PORT=3101 bun run test:e2e:production",
    );
    expect(
      commandsFor(jobSchema.parse(fullCi.jobs.production_e2e)).join("\n"),
    ).not.toContain("bun run build");
    expect(commandsFor(jobSchema.parse(fullCi.jobs.bundle_analysis))).toEqual(
      expect.arrayContaining(["bun run build", "timeout 10m bun run analyze"]),
    );
  }, 30_000);

  it("CI selections are disjoint and together execute the complete Playwright inventory", async () => {
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
    const inventory = async (
      script: string,
      env: Record<string, string> = {},
    ) => {
      expect(packageJson.scripts[script]).toBeDefined();
      const result = await runTestProcess(
        "bun",
        ["run", script, "--list", "--reporter=json"],
        {
          cwd: process.cwd(),
          env: { ...process.env, ...env },
          timeout: 15_000,
        },
      );
      expect(result.status, result.stdout + result.stderr).toBe(0);
      return collect(JSON.parse(result.stdout));
    };
    const commands = [
      ...commandsFor(jobSchema.parse(ci.jobs.high_risk_development_e2e)),
      ...commandsFor(jobSchema.parse(ci.jobs.high_risk_production_e2e)),
      ...commandsFor(jobSchema.parse(fullCi.jobs.development_e2e)),
      ...commandsFor(jobSchema.parse(fullCi.jobs.production_e2e)),
    ];
    expect(commands).toContain(
      "PLAYWRIGHT_USE_DEV_SERVER=1 PLAYWRIGHT_PORT=3100 bun run test:e2e:development",
    );
    expect(commands).toContain(
      "PLAYWRIGHT_USE_DEV_SERVER=0 PLAYWRIGHT_PORT=3101 bun run test:e2e:production",
    );
    expect(commands.join("\n")).not.toContain(
      "PLAYWRIGHT_REUSE_EXISTING_SERVER=1",
    );
    const full = await inventory("test:e2e");
    const dev = await inventory("test:e2e:development", {
      PLAYWRIGHT_USE_DEV_SERVER: "1",
      PLAYWRIGHT_PORT: "3100",
    });
    const production = await inventory("test:e2e:production", {
      PLAYWRIGHT_USE_DEV_SERVER: "0",
      PLAYWRIGHT_PORT: "3101",
    });
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
