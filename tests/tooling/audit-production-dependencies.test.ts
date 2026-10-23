// @vitest-environment node

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  parseBunLock,
  createProductionFindings,
  evaluateAudit,
  parseBunAuditProcessOutput,
  parseBunAuditOutput,
  type AuditException,
  type AuditFinding,
} from "../../scripts/audit-production-dependencies";

const finding: AuditFinding = {
  advisory: "GHSA-aaaa-bbbb-cccc",
  dependencyPath: "runtime-client>transport",
  packageName: "transport",
  severity: "high",
  title: "Example runtime vulnerability",
};

const validException: AuditException = {
  advisory: finding.advisory,
  dependencyPath: finding.dependencyPath,
  mitigation: "The vulnerable API is not called with untrusted input.",
  owner: "maintainer",
  expiresOn: "2026-12-01",
};

describe("production dependency audit policy", () => {
  it("parses the unique audit object after dotenv, ANSI, and Bun banners", () => {
    const output = [
      '[0.32ms] ".env.local", ".env"',
      "\u001b[1mbun audit v1.3.3\u001b[0m",
      '{"transport":[{"url":"https://github.com/advisories/GHSA-aaaa-bbbb-cccc","title":"Example {advisory}","severity":"high","vulnerable_versions":"<2.0.0"}]}',
    ].join("\n");

    expect(parseBunAuditOutput(output)).toEqual({
      transport: [
        {
          url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
          title: "Example {advisory}",
          severity: "high",
          vulnerable_versions: "<2.0.0",
        },
      ],
    });
  });

  it("fails closed when audit JSON is missing or ambiguous", () => {
    expect(() =>
      parseBunAuditOutput("bun audit v1.3.3\nNo vulnerabilities"),
    ).toThrow(/JSON/i);
    expect(() => parseBunAuditOutput("{}\n{}")).toThrow(
      /multiple|unique|ambiguous/i,
    );
  });

  it("accepts Bun 1.4 audit JSON written to stderr", () => {
    expect(parseBunAuditProcessOutput("", '[0.10ms] ".env"\n{}\n')).toEqual({});
  });

  it("follows transitive runtime dependencies and skips unresolved or development-only packages", () => {
    const advisory = {
      url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
      title: "Transitive vulnerability",
      severity: "high" as const,
      vulnerable_versions: "<2.0.0",
    };

    expect(
      createProductionFindings(
        { transport: [advisory], development: [advisory] },
        {
          workspaces: { "": { dependencies: { runtime: "1.0.0" } } },
          packages: {
            runtime: [
              "runtime@1.0.0",
              "",
              { dependencies: { bridge: "1.0.0" } },
            ],
            bridge: [
              "bridge@1.0.0",
              "",
              {
                dependencies: { transport: "1.0.0", missing: "1.0.0" },
                peerDependencies: { development: "1.0.0" },
                optionalPeers: ["development"],
              },
            ],
            transport: ["transport@1.0.0", ""],
            development: ["development@1.0.0", ""],
          },
        },
      ),
    ).toEqual([
      {
        advisory: "GHSA-aaaa-bbbb-cccc",
        dependencyPath: "runtime@1.0.0>bridge@1.0.0>transport@1.0.0",
        packageName: "transport",
        severity: "high",
        title: "Transitive vulnerability",
      },
    ]);
  });

  it("blocks an unexcepted production High finding", () => {
    expect(evaluateAudit([finding], [], "2026-09-04").blocking).toEqual([
      finding,
    ]);
  });

  it("accepts a narrow, unexpired exception", () => {
    expect(
      evaluateAudit([finding], [validException], "2026-09-04").blocking,
    ).toEqual([]);
  });

  it("blocks expired and wildcard exceptions", () => {
    expect(
      evaluateAudit(
        [finding],
        [{ ...validException, expiresOn: "2026-09-03" }],
        "2026-09-04",
      ).blocking,
    ).toEqual([finding]);
    expect(() =>
      evaluateAudit(
        [finding],
        [{ ...validException, dependencyPath: "*" }],
        "2026-09-04",
      ),
    ).toThrow(/wildcard/i);
  });
});

describe("Bun lock JSONC parsing", () => {
  it("imports audit policy in Node without requiring the Bun runtime", () => {
    expect("Bun" in globalThis).toBe(false);
    expect(parseBunLock).toBeTypeOf("function");
  });
  it.each([
    ['{// comment\n"workspaces":{},"packages":{},}', true],
    [
      '{"workspaces":{},/* block */"packages":{},"text":"comma,} escaped\\\" quote"}',
      true,
    ],
    ['{"workspaces":{},"packages":{},"nested":[1,2,],}', true],
    ['{"workspaces":{},"packages":', false],
    ['{"unexpected":true}', false],
  ])("parses JSONC and rejects invalid lock input %#", (input, valid) => {
    const directory = mkdtempSync(join(tmpdir(), "honeycomb-lock-jsonc-"));
    try {
      const path = join(directory, "bun.lock");
      writeFileSync(path, input);
      const result = spawnSync(
        "bun",
        [
          "--no-env-file",
          "-e",
          `import { parseBunLock } from ${JSON.stringify(resolve("scripts/audit-production-dependencies.ts"))}; console.log(JSON.stringify(parseBunLock(${JSON.stringify(path)})));`,
        ],
        { encoding: "utf8", timeout: 10000 },
      );
      expect(result.error).toBeUndefined();
      expect(result.status === 0, result.stderr).toBe(valid);
      if (valid) {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchObject({ workspaces: {}, packages: {} });
        if (input.includes('"text"'))
          expect(parsed.text).toBe('comma,} escaped" quote');
        if (input.includes('"nested"')) expect(parsed.nested).toEqual([1, 2]);
      }
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
