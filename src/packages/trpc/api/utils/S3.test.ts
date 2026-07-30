import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryObservability } from "@/packages/observability/adapters/memory";
import { MetricName } from "@/packages/observability/core/names";
import { configureObservability } from "@/packages/observability/server";
import S3 from "./S3";

describe("S3 observability", () => {
  const send = vi.fn();

  beforeEach(() => {
    send.mockReset();
    process.env.R2_ACCOUNT_ID = "0123456789abcdef0123456789abcdef";
    process.env.R2_ACCESS_KEY_ID = "access";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_BUCKET_NAME = "bucket";
    vi.spyOn(S3, "S3").mockReturnValue({ send } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    configureObservability();
  });

  it("records object storage upload success without object keys", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    send.mockResolvedValue({});

    await S3.putObject({
      Bucket: "ignored-by-wrapper",
      Key: "private/user-123.png",
      Body: "image",
    });

    expect(memory.metricEvents.map(({ name }) => name)).toEqual([
      MetricName.externalServiceOperationsTotal,
      MetricName.externalServiceOperationDurationMs,
    ]);
    expect(memory.metricEvents.every((event) =>
      event.labels.service === "object-storage" &&
      event.labels.operation === "put" &&
      event.labels.outcome === "success"
    )).toBe(true);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("user-123");
  });

  it("records object storage delete failures and preserves the error", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const failure = new Error("object private/user-123.png failed");
    send.mockRejectedValue(failure);

    await expect(S3.deleteMultipleObject({
      Objects: [{ Key: "private/user-123.png" }],
    })).rejects.toBe(failure);

    expect(memory.metricEvents.map(({ name }) => name)).toEqual([
      MetricName.externalServiceOperationsTotal,
      MetricName.externalServiceErrorsTotal,
      MetricName.externalServiceOperationDurationMs,
    ]);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("user-123");
  });

  it.each([
    {
      name: "partial",
      response: {
        Deleted: [{ Key: "public/ok.png" }],
        Errors: [{ Key: "private/user-123.png", Message: "access denied" }],
      },
    },
    {
      name: "complete",
      response: {
        Errors: [
          { Key: "private/user-123.png", Message: "access denied" },
          { Key: "private/user-456.png", Message: "provider unavailable" },
        ],
      },
    },
  ])("records $name delete response errors as safe failures", async ({ response }) => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    send.mockResolvedValue(response);

    await expect(S3.deleteMultipleObject({
      Objects: [
        { Key: "private/user-123.png" },
        { Key: "private/user-456.png" },
      ],
    })).rejects.toThrow("Object storage delete failed");

    expect(memory.metricEvents.map(({ name }) => name)).toEqual([
      MetricName.externalServiceOperationsTotal,
      MetricName.externalServiceErrorsTotal,
      MetricName.externalServiceOperationDurationMs,
    ]);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("user-123");
    expect(JSON.stringify(memory.metricEvents)).not.toContain("access denied");
  });
});
