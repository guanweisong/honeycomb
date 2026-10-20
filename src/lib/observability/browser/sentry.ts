import type { ErrorEvent, EventHint } from "@sentry/nextjs";

// An allowlist keeps arbitrary messages, URLs, scope data and user content out.
// Compiled asset locations still allow grouping/debugging without source uploads.
export function sanitizeBrowserError(
  event: ErrorEvent,
  hint?: EventHint,
): ErrorEvent | null {
  if (hint) hint.attachments = [];
  if (!event.exception?.values?.length) return null;
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: "javascript",
    environment: ["production", "preview", "development", "test"].includes(
      event.environment ?? "",
    )
      ? event.environment
      : undefined,
    level: "error",
    exception: {
      values: event.exception.values.map((exception) => ({
        type: /^(?:Error|TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError|AggregateError)$/.test(
          exception.type ?? "",
        )
          ? exception.type
          : "Error",
        value: "[REDACTED]",
        ...(exception.mechanism
          ? {
              mechanism: {
                type: [
                  "auto.browser.global_handlers.onerror",
                  "auto.browser.global_handlers.onunhandledrejection",
                  "onerror",
                  "onunhandledrejection",
                  "generic",
                  "instrument",
                ].includes(exception.mechanism.type)
                  ? exception.mechanism.type
                  : "generic",
                handled: exception.mechanism.handled,
              },
            }
          : {}),
        stacktrace: exception.stacktrace
          ? {
              frames: exception.stacktrace.frames?.map((frame) => ({
                // Never retain page paths, arbitrary script URLs or URL parameters.
                filename: safeAssetPath(frame.filename),
                lineno: frame.lineno,
                colno: frame.colno,
              })),
            }
          : undefined,
      })),
    },
  };
}

function safeAssetPath(filename: string | undefined): string {
  try {
    const path = new URL(filename ?? "", "https://asset.invalid").pathname;
    return /^\/_next\/static\/[a-zA-Z0-9_./-]+\.js$/.test(path)
      ? path
      : "[REDACTED]";
  } catch {
    return "[REDACTED]";
  }
}
