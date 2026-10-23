// @vitest-environment node

import { mockAbortSignalTimeout } from "@tests/helpers/abort-signal-timeout";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { validateCaptcha } from "./validate-captcha";
import { createMemoryObservability } from "@tests/helpers/memory-observability";
import { MetricName } from "@/lib/observability/core/names";
import { configureObservability } from "@/lib/observability/server";

describe("validate-captcha", () => {
  const fetchMock = vi.fn();
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;
  const originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.TURNSTILE_SECRET_KEY = "secret";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    configureObservability();
    vi.unstubAllGlobals();
    process.env.TURNSTILE_SECRET_KEY = originalSecret;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey;
  });

  it("rejects when the token is missing", async () => {
    await expect(validateCaptcha(undefined)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "请提供有效的验证码参数。",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips verification when Turnstile is disabled", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    await expect(validateCaptcha(undefined)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects when the verification service returns a failure", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    });

    await expect(validateCaptcha("token")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "验证码不正确 (errors: invalid-input-response)",
    });
    expect(memory.metricEvents.map(({ name }) => name)).toEqual([
      MetricName.externalServiceOperationsTotal,
      MetricName.externalServiceErrorsTotal,
      MetricName.externalServiceOperationDurationMs,
    ]);
  });

  it("rejects when the verification request fails", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(validateCaptcha("token")).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "验证码服务出现问题。",
    });
    expect(memory.metricEvents.map(({ name }) => name)).toEqual([
      MetricName.externalServiceOperationsTotal,
      MetricName.externalServiceErrorsTotal,
      MetricName.externalServiceOperationDurationMs,
    ]);
    expect(
      memory.metricEvents.every(
        (event) =>
          event.labels.service === "captcha" &&
          event.labels.operation === "validate" &&
          event.labels.outcome === "error",
      ),
    ).toBe(true);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("token");
  });

  it.each(["headers", "body"] as const)(
    "aborts a stalled %s within the application deadline",
    async (stage) => {
      vi.useFakeTimers();
      mockAbortSignalTimeout("Request timed out");
      const memory = createMemoryObservability();
      configureObservability(memory);
      let requestSignal: AbortSignal | null | undefined;
      fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
        requestSignal = init?.signal;
        const pending = () =>
          new Promise<never>((_resolve, reject) => {
            requestSignal?.addEventListener(
              "abort",
              () => reject(requestSignal?.reason),
              { once: true },
            );
          });
        return stage === "headers"
          ? pending()
          : Promise.resolve({ ok: true, json: pending });
      });
      const nextBusinessStep = vi.fn();
      let caught: unknown;
      const operation = validateCaptcha("synthetic-captcha-token").then(
        nextBusinessStep,
        (error: unknown) => {
          caught = error;
        },
      );
      await vi.advanceTimersByTimeAsync(9999);
      expect(caught).toBeUndefined();
      await vi.advanceTimersByTimeAsync(1);
      expect(requestSignal?.aborted).toBe(true);
      await operation;
      expect(caught).toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "验证码服务出现问题。",
      });
      expect(nextBusinessStep).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        JSON.stringify([caught, memory.logEvents, memory.metricEvents]),
      ).not.toContain("synthetic-captcha-token");
      expect(
        JSON.stringify([caught, memory.logEvents, memory.metricEvents]),
      ).not.toContain('"secret"');
    },
  );

  it("resolves when the verification succeeds", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
      }),
    });

    await expect(validateCaptcha("token")).resolves.toBeUndefined();
    expect(memory.metricEvents.map(({ name }) => name)).toEqual([
      MetricName.externalServiceOperationsTotal,
      MetricName.externalServiceOperationDurationMs,
    ]);
  });

  it.each([null, {}, { success: "true" }, { success: true, "error-codes": 1 }])(
    "rejects malformed verification data: %j",
    async (data) => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => data });
      await expect(validateCaptcha("token")).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      });
    },
  );
});
