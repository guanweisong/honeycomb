import type { Logger } from "@/lib/observability/core/contracts";
import {
  getRuntimeEnvironment,
  type ConsoleAdapterOptions,
} from "@/lib/observability/adapters/console-options";

/** 内部 JSON 输出端；调用方必须使用安全日志 facade。 */
export function createConsoleLogSink(
  options: ConsoleAdapterOptions = {},
): Logger {
  const service = options.service ?? "honeycomb";
  const environment = options.environment ?? getRuntimeEnvironment();
  const write = options.write ?? ((line: string) => console.log(line));

  return {
    info: (event, context) =>
      writeLog(write, "info", event, context, service, environment),
    warn: (event, context) =>
      writeLog(write, "warn", event, context, service, environment),
    error: (event, context) =>
      writeLog(write, "error", event, context, service, environment),
  };
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
      ...context,
      timestamp: new Date().toISOString(),
      level,
      event,
      service,
      environment,
    }),
  );
}
