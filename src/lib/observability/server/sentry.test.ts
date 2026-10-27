// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => sdk);
import { configureSentryLogs } from "@/lib/observability/server/sentry";
import { configureObservability, getLogger, getMetrics } from "@/lib/observability/server/registry";
import { LogEvent, MetricName } from "@/lib/observability/core/names";
describe("Sentry setup", () => {
  afterEach(() => {
    configureObservability();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  it("enables explicit logs only and preserves custom metrics", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const metrics = { increment: vi.fn(), recordDuration: vi.fn() };
    configureObservability({ metrics });
    vi.stubEnv("VERCEL_ENV", "preview");
    configureSentryLogs("https://public@example.invalid/1");
    expect(sdk.init).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: "preview",
        defaultIntegrations: false,
        includeServerName: false,
        tracesSampleRate: 0,
        traceLifecycle: "static",
        enableOpenTelemetrySetup: false,
        enableRuntimeChannelInjection: false,
      }),
    );
    const options = sdk.init.mock.calls.at(-1)![0];
    expect(options.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      httpHeaders: false,
    });
    expect(options.beforeSend({})).toBeNull();
    expect(
      options.beforeSendLog({ attributes: { email: "private@example.com" } })
        .attributes.email,
    ).toBe("[REDACTED]");
    getLogger().warn(LogEvent.requestFailed, { requestId: "req-test" });
    expect(sdk.logger.warn).toHaveBeenCalledWith("request.failed", {
      requestId: "req-test",
      service: "honeycomb",
    });
    getMetrics().increment(MetricName.apiRequestsTotal);
    expect(metrics.increment).toHaveBeenCalledWith(
      MetricName.apiRequestsTotal,
      {},
    );
    expect(output).toHaveBeenCalledTimes(1);
  });
});
