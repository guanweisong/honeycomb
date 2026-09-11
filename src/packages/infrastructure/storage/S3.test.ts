import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryObservability } from "@/packages/infrastructure/observability/adapters/memory";
import { MetricName } from "@/packages/infrastructure/observability/core/names";
import { configureObservability } from "@/packages/infrastructure/observability/server";
import { createSecurityHeaderOptions } from "@/packages/infrastructure/security/security-headers";
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
    vi.useRealTimers();
    configureObservability();
  });

  it("changing a signed content type produces a different signature for the same PUT", async () => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T00:00:00Z"));
    const original = new URL(
      await S3.getPresignedUrl({
        Key: "uploads/bound.png",
        ContentType: "image/png",
        ContentLength: 10,
      }),
    );
    const altered = new URL(
      await S3.getPresignedUrl({
        Key: "uploads/bound.png",
        ContentType: "text/html",
        ContentLength: 10,
      }),
    );
    expect(original.searchParams.get("X-Amz-SignedHeaders")).toBe(
      "content-length;content-type;host",
    );
    const originalSignature = original.searchParams.get("X-Amz-Signature");
    const alteredSignature = altered.searchParams.get("X-Amz-Signature");
    original.searchParams.delete("X-Amz-Signature");
    altered.searchParams.delete("X-Amz-Signature");
    expect(original.toString()).toBe(altered.toString());
    expect(originalSignature).not.toBe(alteredSignature);
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
    expect(
      memory.metricEvents.every(
        (event) =>
          event.labels.service === "object-storage" &&
          event.labels.operation === "put" &&
          event.labels.outcome === "success",
      ),
    ).toBe(true);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("user-123");
  });

  it("keeps presigned uploads on the CSP account origin with bucket and key in the path", async () => {
    vi.restoreAllMocks();

    const presignedUrl = new URL(
      await S3.getPresignedUrl({
        Key: "uploads/csp-probe.png",
        ContentType: "image/png",
        ContentLength: 10,
      }),
    );
    const securityOptions = createSecurityHeaderOptions(process.env);

    expect(presignedUrl.origin).toBe(securityOptions.r2UploadOrigin);
    expect(presignedUrl.origin).toBe(
      "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
    );
    expect(presignedUrl.pathname).toBe("/bucket/uploads/csp-probe.png");
    expect(presignedUrl.searchParams.get("X-Amz-SignedHeaders")).toContain(
      "content-length",
    );
    expect(presignedUrl.searchParams.get("X-Amz-SignedHeaders")).toContain(
      "content-type",
    );
    expect(presignedUrl.searchParams.get("X-Amz-Algorithm")).toBe(
      "AWS4-HMAC-SHA256",
    );
  });

  it("signs cleanup for the same object without deleting it during presign", async () => {
    vi.restoreAllMocks();
    const cleanup = new URL(
      await S3.getPresignedDeleteUrl("uploads/orphan.png"),
    );
    expect(cleanup.pathname).toBe("/bucket/uploads/orphan.png");
    expect(cleanup.searchParams.get("X-Amz-Expires")).toBe("3600");
    expect(cleanup.searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
  });

  it("records object storage delete failures and preserves the error", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const failure = new Error("object private/user-123.png failed");
    send.mockRejectedValue(failure);

    await expect(
      S3.deleteMultipleObject({
        Objects: [{ Key: "private/user-123.png" }],
      }),
    ).rejects.toBe(failure);

    expect(memory.metricEvents.map(({ name }) => name)).toEqual([
      MetricName.externalServiceOperationsTotal,
      MetricName.externalServiceErrorsTotal,
      MetricName.externalServiceOperationDurationMs,
    ]);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("user-123");
  });

  it("maps keys through the idempotent storage deletion port", async () => {
    send.mockResolvedValue({ Deleted: [] });

    await expect(
      S3.deleteObjects(["already-missing.png"]),
    ).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0].input.Delete.Objects).toEqual([
      { Key: "already-missing.png" },
    ]);
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
  ])(
    "records $name delete response errors as safe failures",
    async ({ response }) => {
      const memory = createMemoryObservability();
      configureObservability(memory);
      send.mockResolvedValue(response);

      await expect(
        S3.deleteMultipleObject({
          Objects: [
            { Key: "private/user-123.png" },
            { Key: "private/user-456.png" },
          ],
        }),
      ).rejects.toThrow("Object storage delete failed");

      expect(memory.metricEvents.map(({ name }) => name)).toEqual([
        MetricName.externalServiceOperationsTotal,
        MetricName.externalServiceErrorsTotal,
        MetricName.externalServiceOperationDurationMs,
      ]);
      expect(JSON.stringify(memory.metricEvents)).not.toContain("user-123");
      expect(JSON.stringify(memory.metricEvents)).not.toContain(
        "access denied",
      );
    },
  );
});
