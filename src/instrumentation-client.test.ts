import { afterEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  globalHandlersIntegration: vi.fn(() => ({ name: "GlobalHandlers" })),
  browserApiErrorsIntegration: vi.fn(() => ({ name: "BrowserApiErrors" })),
  dedupeIntegration: vi.fn(() => ({ name: "Dedupe" })),
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
    await import("./instrumentation-client");
    expect(sdk.init).not.toHaveBeenCalled();
  });
  it("initializes only error handlers and drops logs/metrics", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.invalid/1");
    await import("./instrumentation-client");
    expect(sdk.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@example.invalid/1",
        defaultIntegrations: false,
        tracesSampleRate: 0,
      }),
    );
    const options = sdk.init.mock.calls[0]![0];
    expect(options.integrations.map((i: { name: string }) => i.name)).toEqual([
      "GlobalHandlers",
      "BrowserApiErrors",
      "Dedupe",
    ]);
    expect(options.beforeSendLog({})).toBeNull();
    expect(options.beforeSendMetric({})).toBeNull();
  });
});
