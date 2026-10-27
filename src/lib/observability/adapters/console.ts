import type { Logger } from "@/lib/observability/core/contracts";
import { createSafeLogger } from "@/lib/observability/core/safe-adapters";
import { sanitizeContext } from "@/lib/observability/core/sanitize";
import {
  getRuntimeEnvironment,
  type ConsoleAdapterOptions,
} from "@/lib/observability/adapters/console-options";

export function createConsoleLogger(
  options: ConsoleAdapterOptions = {},
): Logger {
  const service = options.service ?? "honeycomb";
  const environment = options.environment ?? getRuntimeEnvironment();
  const write = options.write ?? ((line: string) => console.log(line));

  return createSafeLogger({
    info: (event, context) =>
      writeLog(write, "info", event, context, service, environment),
    warn: (event, context) =>
      writeLog(write, "warn", event, context, service, environment),
    error: (event, context) =>
      writeLog(write, "error", event, context, service, environment),
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
