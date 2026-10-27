import { requireDefined } from "@tests/helpers/require-defined";
import { afterEach, describe, expect, it, vi } from "vitest";

type SentrySdk = typeof import("@sentry/nextjs");

const sdk = vi.hoisted(() => ({
  init: vi.fn<SentrySdk["init"]>(),
  globalHandlersIntegration: vi.fn<SentrySdk["globalHandlersIntegration"]>(
    () => ({ name: "GlobalHandlers" }),
  ),
  browserApiErrorsIntegration: vi.fn<SentrySdk["browserApiErrorsIntegration"]>(
    () => ({ name: "BrowserApiErrors" }),
  ),
  dedupeIntegration: vi.fn<SentrySdk["dedupeIntegration"]>(() => ({
    name: "Dedupe",
  })),
}));
vi.mock("@sentry/nextjs", () => sdk);
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe("browser error instrumentation", () => {
  it("does not initialize without the public DSN, even if the server fallback exists", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_DSN", "https://legacy@example.invalid/1");
    await import("@/instrumentation-client");
    expect(sdk.init).not.toHaveBeenCalled();
  });
  it("initializes only error handlers and drops logs/metrics", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.invalid/1");
    await import("@/instrumentation-client");
    expect(sdk.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@example.invalid/1",
        defaultIntegrations: false,
        tracesSampleRate: 0,
      }),
    );
    const [options] = requireDefined(sdk.init.mock.calls[0]);
    const integrations = options.integrations;
    if (!Array.isArray(integrations)) {
      throw new Error("Expected an explicit browser integration list");
    }
    expect(integrations.map((integration) => integration.name)).toEqual([
      "GlobalHandlers",
      "BrowserApiErrors",
      "Dedupe",
    ]);
    const beforeSendLog = requireDefined(options.beforeSendLog);
    const beforeSendMetric = requireDefined(options.beforeSendMetric);
    expect(beforeSendLog({ level: "info", message: "Test log" })).toBeNull();
    expect(
      beforeSendMetric({ name: "test.count", value: 1, type: "counter" }),
    ).toBeNull();
  });
});
