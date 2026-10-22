// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  databaseOperations,
  externalServices,
  externalServiceOperations,
  metricLabelValueCatalog,
} from "./metric-label-values";

describe("metric operation catalogs", () => {
  it("retains the complete operation allowlist and its insertion order", () => {
    expect([...metricLabelValueCatalog.operation]).toEqual([
      "select",
      "insert",
      "update",
      "delete",
      "transaction",
      "read",
      "hit",
      "miss",
      "write",
      "error",
      "validate",
      "send",
      "put",
      "presign",
      "invalidate",
      "limit",
    ]);
  });

  it("retains distinct database and external operation subsets", () => {
    expect(databaseOperations).toEqual([
      "select",
      "insert",
      "update",
      "delete",
      "transaction",
    ]);
    expect(externalServiceOperations).toEqual([
      "validate",
      "send",
      "put",
      "presign",
      "delete",
    ]);
    for (const operation of [
      ...databaseOperations,
      ...externalServiceOperations,
    ]) {
      expect(metricLabelValueCatalog.operation.has(operation)).toBe(true);
    }
  });

  it("retains the dedicated rate-limit service outside the external observer subset", () => {
    expect(externalServices).toEqual(["captcha", "email", "object-storage"]);
    expect([...metricLabelValueCatalog.service]).toEqual([
      "captcha",
      "email",
      "object-storage",
      "upstash-rate-limit",
    ]);
  });
});
