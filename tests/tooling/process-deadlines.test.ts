// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import { sourceFile } from "@tests/helpers/source-files";

it.each([
  "tests/architecture/server-only-boundaries.test.ts",
  "tests/tooling/coverage-governance.test.ts",
  "tests/tooling/quality-spec.test.ts",
  "tests/tooling/quality-workflow.test.ts",
])("every blocking process in %s owns a hard deadline", (path) => {
  const calls: ts.CallExpression[] = [];
  const source = sourceFile(path);
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["spawnSync", "runTestProcess"].includes(node.expression.text)
    )
      calls.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) {
    const options = call.arguments[2];
    expect(options && ts.isObjectLiteralExpression(options)).toBe(true);
    if (!options || !ts.isObjectLiteralExpression(options))
      throw new Error("Expected explicit process options");
    const values = new Map(
      options.properties
        .filter(ts.isPropertyAssignment)
        .map((property) => [
          property.name.getText(source),
          property.initializer.getText(source),
        ]),
    );
    expect(values.get("timeout")).toEqual(expect.stringMatching(/^[\d_]+$/));
    expect(Number(values.get("timeout")?.replaceAll("_", ""))).toBeGreaterThan(
      0,
    );
    if (call.expression.getText(source) === "spawnSync") {
      // The only remaining synchronous boundary is the tiny shell gate.
      expect(call.arguments[0]?.getText(source)).toBe('"bash"');
      expect(values.get("killSignal")).toBe('"SIGKILL"');
    } else {
      expect(ts.isAwaitExpression(call.parent)).toBe(true);
    }
  }
  expect(source.getText()).toContain("@tests/helpers/run-test-process");
});

it("terminates an unresponsive child even if SIGTERM is ignored and cleans its fixture", () => {
  const fixture = mkdtempSync(join(tmpdir(), "honeycomb-process-timeout-"));
  try {
    const result = spawnSync(
      process.execPath,
      ["-e", 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)'],
      {
        cwd: fixture,
        encoding: "utf8",
        timeout: 200,
        killSignal: "SIGKILL",
      },
    );
    expect(result.error).toMatchObject({ code: "ETIMEDOUT" });
    expect(result.status).toBeNull();
    expect(result.signal).toBe("SIGKILL");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
  expect(existsSync(fixture)).toBe(false);
});
