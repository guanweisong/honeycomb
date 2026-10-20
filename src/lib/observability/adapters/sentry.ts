import type { Logger, LogContext } from "../core/contracts";
import { createSafeLogger } from "../core/safe-adapters";
import { sanitizeContext } from "../core/sanitize";
import { createConsoleLogger } from "./console";

type LogAttributes = Record<string, string | number | boolean>;
interface SentryLogSink {
  info(message: string, attributes: LogAttributes): void;
  warn(message: string, attributes: LogAttributes): void;
  error(message: string, attributes: LogAttributes): void;
}

/** Keep business callers independent of Sentry and preserve local JSON logs. */
export function createSentryLogger(
  sink: SentryLogSink,
  consoleLogger: Logger = createConsoleLogger(),
): Logger {
  const local = createSafeLogger(consoleLogger);
  const remote = createSafeLogger({
    info: (event, context) => sink.info(event, toAttributes(context)),
    warn: (event, context) => sink.warn(event, toAttributes(context)),
    error: (event, context) => sink.error(event, toAttributes(context)),
  });
  return {
    info: (event, context) => {
      local.info(event, context);
      remote.info(event, context);
    },
    warn: (event, context) => {
      local.warn(event, context);
      remote.warn(event, context);
    },
    error: (event, context) => {
      local.error(event, context);
      remote.error(event, context);
    },
  };
}
function toAttributes(context: LogContext = {}): LogAttributes {
  return {
    ...Object.fromEntries(
      Object.entries(sanitizeContext(context)).map(([key, value]) => [
        key,
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
          ? value
          : JSON.stringify(value),
      ]),
    ),
    service: "honeycomb",
  };
}
