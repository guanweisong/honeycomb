import type { Logger } from "../core/contracts";
import { createSafeLogger } from "../core/safe-adapters";
import { sanitizeContext } from "../core/sanitize";

export interface ConsoleLoggerOptions {
  service?: string;
  environment?: string;
  write?: (line: string) => void;
}

export function createConsoleLogger(
  options: ConsoleLoggerOptions = {},
): Logger {
  const service = options.service ?? "honeycomb";
  const environment = options.environment ?? getEnvironment();
  const write = options.write ?? ((line: string) => console.log(line));

  return createSafeLogger({
    info: (event, context) => writeLog(write, "info", event, context, service, environment),
    warn: (event, context) => writeLog(write, "warn", event, context, service, environment),
    error: (event, context) => writeLog(write, "error", event, context, service, environment),
  });
}

function writeLog(
  write: (line: string) => void,
  level: "info" | "warn" | "error",
  event: string,
  context: Record<string, unknown> | undefined,
  service: string,
  environment: string,
): void {
  write(
    JSON.stringify({
      ...sanitizeContext(context ?? {}),
      timestamp: new Date().toISOString(),
      level,
      event,
      service,
      environment,
    }),
  );
}

function getEnvironment(): string {
  return typeof process === "undefined" ? "development" : process.env.NODE_ENV ?? "development";
}
