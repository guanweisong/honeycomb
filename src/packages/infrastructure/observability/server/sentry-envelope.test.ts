// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

type TransportFactory = NonNullable<
  Parameters<typeof Sentry.init>[0]["transport"]
>;
type Envelope = Parameters<ReturnType<TransportFactory>["send"]>[0];

const captured = vi.hoisted(() => ({ envelopes: [] as Envelope[] }));

// Keep the real SDK initialization, buffering, sanitization and serialization.
// Replace only transport creation, so even a failing assertion cannot send data.
vi.mock("@sentry/nextjs", async () => {
  const { createRequire } = await import("node:module");
  // The CJS entry exposes dynamically re-exported Node SDK methods that Vite
  // does not enumerate when spreading its synthetic ESM namespace.
  const actual = createRequire(import.meta.url)(
    "@sentry/nextjs",
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
import { LogEvent } from "../core/names";
import { configureObservability, getLogger } from "./registry";
import { configureSentryLogs } from "./sentry";

// Vitest isolates this file from the mocked SDK unit tests. Closing the actual
// client also removes its beforeExit listeners and client-report timer.
afterEach(async () => {
  await Sentry.close(1000);
  Sentry.getCurrentScope().setClient(undefined);
  configureObservability();
  captured.envelopes.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Sentry log envelope", () => {
  it("emits sanitized typed logs without hostname, exceptions or tracing", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NEXT_PHASE", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    configureSentryLogs("https://public@example.invalid/1");

    const client = Sentry.getClient();
    expect(client).toBeDefined();
    expect(client!.getOptions().integrations).toEqual([]);

    getLogger().error(LogEvent.serverError, {
      requestId: "req-envelope",
      durationMs: 12,
      retryable: false,
      authorization: "Bearer private-credential",
      body: { title: "private-draft" },
      nested: { password: "private-password" },
      error: new Error("token=private-token person@example.com"),
    });
    Sentry.captureException(new Error("private-exception"));
    Sentry.startSpan({ name: "private-span" }, () => undefined);
    await Sentry.flush(1000);

    const items = captured.envelopes.flatMap<Envelope[1][number]>(
      (envelope) => envelope[1],
    );
    // Client reports are SDK delivery diagnostics, not captured application data.
    const dataItems = items.filter(
      ([header]) => header.type !== "client_report",
    );
    expect(dataItems).toEqual([
      [
        expect.objectContaining({
          type: "log",
          item_count: 1,
          content_type: "application/vnd.sentry.items.log+json",
        }),
        expect.objectContaining({
          version: 2,
          items: [
            expect.objectContaining({
              level: "error",
              body: "server.error",
              attributes: expect.objectContaining({
                requestId: { type: "string", value: "req-envelope" },
                durationMs: { type: "integer", value: 12 },
                retryable: { type: "boolean", value: false },
                service: { type: "string", value: "honeycomb" },
                authorization: { type: "string", value: "[REDACTED]" },
                body: { type: "string", value: "[REDACTED]" },
                nested: { type: "string", value: '{"password":"[REDACTED]"}' },
              }),
            }),
          ],
        }),
      ],
    ]);
    const serialized = JSON.stringify(captured.envelopes);
    expect(serialized).not.toMatch(
      /private-credential|private-draft|private-password|private-token|person@example\.com|private-exception|private-span/,
    );
    expect(serialized).not.toContain('"server.address"');
  });
});
