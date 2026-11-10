// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { S3Client } from "@aws-sdk/client-s3";
import { createMemoryObservability } from "@tests/helpers/memory-observability";
import { MetricName } from "@/lib/observability/core/names";
import { configureObservability } from "@/lib/observability/server";
import * as serverEnv from "@/env/server";
import { createSecurityHeaderOptions } from "@/lib/security/security-headers";
import R2Storage from "@/lib/storage/r2-storage";
import { Readable } from "node:stream";
import { tryAcquireMediaValidation } from "@/features/media/server/image-validation";
import { registerMediaUpload } from "@/features/media/server/media-upload";
import { createUploadIntent } from "@/features/media/server/upload-intent";
import {
  mediaRepositoryFixture,
  mediaStorageFixture,
} from "@tests/helpers/media-registration";

beforeEach(() => {
  vi.stubEnv("R2_ACCOUNT_ID", "0123456789abcdef0123456789abcdef");
  vi.stubEnv("R2_ACCESS_KEY_ID", "access");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
  vi.stubEnv("R2_BUCKET_NAME", "bucket");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function getClientMaxAttempts(client: unknown) {
  if (!(client instanceof S3Client)) throw new Error("Missing SDK client");
  return client.config.maxAttempts();
}

describe("R2Storage observability", () => {
  const send = vi.fn();

  beforeEach(() => {
    send.mockReset();

    vi.spyOn(S3Client.prototype, "send").mockImplementation(send);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    configureObservability();
  });

  it.each(["delete", "head"] as const)(
    "cancels a pending %s at the caller deadline",
    async (operation) => {
      const controller = new AbortController();
      send.mockImplementation(() => new Promise(() => undefined));
      const request =
        operation === "delete"
          ? R2Storage.deleteObjects(["private.png"], controller.signal)
          : R2Storage.headObject("private.png", controller.signal);
      const reason = new Error("caller deadline");
      controller.abort(reason);
      await expect(request).rejects.toBe(reason);
      expect(send.mock.calls[0]?.[1]?.abortSignal?.aborted).toBe(true);
      expect(send).toHaveBeenCalledOnce();
    },
  );

  it("changing a signed content type produces a different signature for the same PUT", async () => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T00:00:00Z"));
    const original = new URL(
      await R2Storage.getPresignedUrl({
        Key: "uploads/bound.png",
        ContentType: "image/png",
        ContentLength: 10,
      }),
    );
    const altered = new URL(
      await R2Storage.getPresignedUrl({
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

    await R2Storage.putValidatedObject(
      "private/user-123.png",
      new Uint8Array([1, 2, 3]),
      "image/png",
    );

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
    const getR2Env = vi.spyOn(serverEnv, "getR2Env");

    const presignedUrl = new URL(
      await R2Storage.getPresignedUrl({
        Key: "uploads/csp-probe.png",
        ContentType: "image/png",
        ContentLength: 10,
      }),
    );
    const securityOptions = createSecurityHeaderOptions(process.env);

    expect(getR2Env).toHaveBeenCalledOnce();
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

  it("records object storage delete failures and preserves the error", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const failure = new Error("object private/user-123.png failed");
    send.mockRejectedValue(failure);

    await expect(
      R2Storage.deleteObjects(["private/user-123.png"]),
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
      R2Storage.deleteObjects(["already-missing.png"]),
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
        R2Storage.deleteObjects([
          "private/user-123.png",
          "private/user-456.png",
        ]),
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

describe("immutable candidate storage", () => {
  afterEach(() => vi.restoreAllMocks());
  it("puts exact validated bytes once with automatic retry disabled", async () => {
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockImplementation(async () => ({}));

    const bytes = Buffer.from("validated");
    await R2Storage.putValidatedObject("media/a.png", bytes, "image/png");
    await expect(getClientMaxAttempts(send.mock.contexts[0])).resolves.toBe(1);
    expect(send.mock.calls[0]?.[0].input).toMatchObject({
      Key: "media/a.png",
      Body: bytes,
      ContentLength: bytes.byteLength,
      ContentType: "image/png",
    });
  });
  it("distinguishes absence from forbidden or unknown HEAD results", async () => {
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockRejectedValue({ $metadata: { httpStatusCode: 404 } });
    expect(await R2Storage.headObject("media/a.png")).toBeNull();
    send.mockRejectedValue({ $metadata: { httpStatusCode: 403 } });
    await expect(R2Storage.headObject("media/a.png")).rejects.toBeDefined();
  });
});
it("bounds streamed candidate reads and destroys oversized streams", async () => {
  const body = Readable.from([Buffer.from("oversized")]);
  vi.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({
    Body: body,
  }));
  await expect(R2Storage.readObject("media/a.png", 3)).rejects.toThrow(
    "byte limit",
  );
  expect(body.destroyed).toBe(true);
});

it("expires a silent body and releases the real registration validation slot", async () => {
  vi.stubEnv("AUTH_SECRET", "synthetic-only-storage-timeout-test-secret");
  vi.stubEnv("AUTH_URL", "https://auth.example.test");
  vi.useFakeTimers();
  const body = new Readable({ read() {} });
  const send = vi
    .spyOn(S3Client.prototype, "send")
    .mockImplementation(async () => ({ Body: body }));
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  storage.readObject.mockImplementation(R2Storage.readObject);
  const { intent } = createUploadIntent(
    { name: "a.png", type: "image/png", size: 10, sha256: "a".repeat(64) },
    "actor",
  );
  const otherRelease = tryAcquireMediaValidation();
  let outcome: unknown;
  const read = registerMediaUpload(repo, storage, intent, "actor").catch(
    (error: unknown) => {
      outcome = error;
    },
  );
  try {
    await vi.advanceTimersByTimeAsync(0);
    expect(tryAcquireMediaValidation()).toBeNull();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(outcome).toMatchObject({
      message: "无法读取临时图片，请检查上传后手动重试",
    });
    expect(body.destroyed).toBe(true);
    expect(send.mock.calls[0]?.[1]?.abortSignal?.aborted).toBe(true);
    expect(repo.insertRegistered).not.toHaveBeenCalled();
    expect(storage.putValidatedObject).not.toHaveBeenCalled();
    expect(storage.deleteObjects).not.toHaveBeenCalled();
    const available = tryAcquireMediaValidation();
    expect(available).not.toBeNull();
    available?.();
  } finally {
    body.destroy();
    await read;
    otherRelease?.();
  }
});

it.each(["head", "read", "put", "delete"] as const)(
  "bounds stalled %s requests and aborts the SDK without retrying mutations",
  async (operation) => {
    vi.useFakeTimers();
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockImplementation(() => new Promise(() => {}));
    const operations = {
      head: () => R2Storage.headObject("media/a.png"),
      read: () => R2Storage.readObject("media/a.png", 10),
      put: () =>
        R2Storage.putValidatedObject(
          "media/a.png",
          Buffer.from("a"),
          "image/png",
        ),
      delete: () => R2Storage.deleteObjects(["media/a.png"]),
    };
    const outcome = expect(operations[operation]()).rejects.toThrow(
      "timed out",
    );
    await vi.advanceTimersByTimeAsync(30_000);
    await outcome;
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[1]?.abortSignal?.aborted).toBe(true);
    await expect(getClientMaxAttempts(send.mock.contexts[0])).resolves.toBe(
      operation === "put" || operation === "delete" ? 1 : 3,
    );
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("clears the deadline after a complete read", async () => {
  vi.useFakeTimers();
  const body = Readable.from([Buffer.from("ok")]);
  const send = vi
    .spyOn(S3Client.prototype, "send")
    .mockImplementation(async () => ({ Body: body }));
  await expect(R2Storage.readObject("media/a.png", 2)).resolves.toEqual(
    Buffer.from("ok"),
  );
  expect(body.destroyed).toBe(true);
  expect(send.mock.calls[0]?.[1]?.abortSignal?.aborted).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

it("uses the same deadline for response headers and silent body consumption", async () => {
  vi.useFakeTimers();
  const body = new Readable({ read() {} });
  vi.spyOn(S3Client.prototype, "send").mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve({ Body: body }), 20_000);
      }),
  );
  let failure: unknown;
  const read = R2Storage.readObject("media/a.png", 10).catch(
    (error: unknown) => {
      failure = error;
    },
  );
  try {
    await vi.advanceTimersByTimeAsync(29_999);
    expect(failure).toBeUndefined();
    expect(body.destroyed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await read;
    expect(failure).toBeInstanceOf(Error);
    expect(body.destroyed).toBe(true);
  } finally {
    body.destroy();
    await read;
  }
});

it("destroys a late body even when the SDK resolves after the deadline", async () => {
  vi.useFakeTimers();
  const body = new Readable({ read() {} });
  vi.spyOn(S3Client.prototype, "send").mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve({ Body: body }), 31_000);
      }),
  );
  const read = expect(R2Storage.readObject("media/a.png", 10)).rejects.toThrow(
    "timed out",
  );
  await vi.advanceTimersByTimeAsync(30_000);
  await read;
  await vi.advanceTimersByTimeAsync(1_000);
  expect(body.destroyed).toBe(true);
});
