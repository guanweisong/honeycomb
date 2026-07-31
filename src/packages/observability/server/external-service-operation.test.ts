import { afterEach, describe, expect, it } from "vitest";
import { createMemoryObservability } from "../adapters/memory";
import { MetricName } from "../core/names";
import { configureObservability } from "./registry";
import { observeExternalServiceOperation } from "./external-service-operation";

describe("observeExternalServiceOperation", () => {
  afterEach(() => configureObservability());

  it("records a successful call count and duration with stable labels", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);

    await expect(
      observeExternalServiceOperation("email", "send", async () => "sent"),
    ).resolves.toBe("sent");

    expect(memory.metricEvents).toEqual([
      {
        type: "increment",
        name: MetricName.externalServiceOperationsTotal,
        labels: { service: "email", operation: "send", outcome: "success" },
      },
      {
        type: "duration",
        name: MetricName.externalServiceOperationDurationMs,
        value: expect.any(Number),
        labels: { service: "email", operation: "send", outcome: "success" },
      },
    ]);
  });

  it("records safe failure metrics and preserves the original rejection", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const failure = new Error("recipient=user@example.com token=secret");

    await expect(
      observeExternalServiceOperation("object-storage", "delete", async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(memory.metricEvents).toEqual([
      {
        type: "increment",
        name: MetricName.externalServiceOperationsTotal,
        labels: {
          service: "object-storage",
          operation: "delete",
          outcome: "error",
        },
      },
      {
        type: "increment",
        name: MetricName.externalServiceErrorsTotal,
        labels: {
          service: "object-storage",
          operation: "delete",
          outcome: "error",
        },
      },
      {
        type: "duration",
        name: MetricName.externalServiceOperationDurationMs,
        value: expect.any(Number),
        labels: {
          service: "object-storage",
          operation: "delete",
          outcome: "error",
        },
      },
    ]);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("example.com");
    expect(JSON.stringify(memory.metricEvents)).not.toContain("secret");
  });
});
