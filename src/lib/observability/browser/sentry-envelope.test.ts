import { afterEach, expect, it, vi } from "vitest";
type TransportFactory = NonNullable<
  Parameters<typeof Sentry.init>[0]["transport"]
>;
type Envelope = Parameters<ReturnType<TransportFactory>["send"]>[0];
const captured = vi.hoisted(() => ({ envelopes: [] as Envelope[] }));

// Use the installed SDK's actual browser entry, replacing only the transport.
// The normal Node test resolver otherwise chooses Sentry's server SDK.
vi.mock("@sentry/nextjs", async () => {
  const { createRequire } = await import("node:module");
  const { dirname, join } = await import("node:path");
  const require = createRequire(import.meta.url);
  const actual = require(
    join(
      dirname(require.resolve("@sentry/nextjs/package.json")),
      "build/cjs/index.client.js",
    ),
  ) as typeof import("@sentry/nextjs");
  return {
    ...actual,
    init: (options: Parameters<typeof actual.init>[0]) =>
      actual.init({
        ...options,
        transport: () => ({
          send: (envelope: Envelope) => {
            captured.envelopes.push(envelope);
            return Promise.resolve({ statusCode: 200 });
          },
          flush: () => Promise.resolve(true),
        }),
      }),
  };
});
import * as Sentry from "@sentry/nextjs";

afterEach(async () => {
  await Sentry.close(1000);
  Sentry.getCurrentScope().setClient(undefined);
  vi.unstubAllEnvs();
});
it("sends only redacted browser exceptions for global errors, rejections and manual boundary captures", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.invalid/1");
  await import("../../../instrumentation-client");
  expect(
    Sentry.getClient()
      ?.getOptions()
      .integrations.map((i) => i.name),
  ).toEqual(["GlobalHandlers", "BrowserApiErrors", "Dedupe"]);
  Sentry.getCurrentScope().addAttachment({
    filename: "private-file.txt",
    data: "private-file-data",
  });
  Sentry.setUser({ id: "private-user", email: "private-email@example.com" });
  Sentry.setContext("secret", { value: "private-context" });
  Sentry.addBreadcrumb({ message: "private-breadcrumb" });
  const error = new TypeError("private-error");
  error.stack =
    "TypeError: private-error\n    at privateFunction (https://app.invalid/_next/static/chunks/abc.js?token=private-token:12:4)";
  globalThis.onerror?.(error.message, "https://app.invalid/", 12, 4, error);
  const rejection = new Event("unhandledrejection");
  Object.defineProperty(rejection, "reason", {
    value: new RangeError("private-rejection"),
  });
  globalThis.onunhandledrejection?.call(
    window,
    rejection as PromiseRejectionEvent,
  );
  Sentry.captureException(new ReferenceError("private-boundary"));
  Sentry.logger.info("private-log");
  Sentry.startSpan({ name: "private-span" }, () => undefined);
  await Sentry.flush(1000);
  const items = captured.envelopes.flatMap<Envelope[1][number]>((e) => e[1]);
  expect(items).toHaveLength(3);
  expect(items.map(([header]) => header.type)).toEqual([
    "event",
    "event",
    "event",
  ]);
  expect(JSON.stringify(captured.envelopes)).not.toContain("private");
  expect(JSON.stringify(captured.envelopes)).toContain(
    "/_next/static/chunks/abc.js",
  );
});
