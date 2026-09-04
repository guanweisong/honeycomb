import { describe, expect, it } from "vitest";

import {
  evaluateAudit,
  type AuditException,
  type AuditFinding,
} from "../scripts/audit-production-dependencies";

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
