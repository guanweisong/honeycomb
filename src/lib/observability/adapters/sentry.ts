import type { Logger, LogContext } from "@/lib/observability/core/contracts";
import { createConsoleLogSink } from "@/lib/observability/adapters/console";

type LogAttributes = Record<string, string | number | boolean>;
interface SentryLogSink {
  info(message: string, attributes: LogAttributes): void;
  warn(message: string, attributes: LogAttributes): void;
  error(message: string, attributes: LogAttributes): void;
}

/** 内部双输出端；安全 facade 先清洗一次，各输出失败仍相互隔离。 */
export function createSentryLogSink(
  sink: SentryLogSink,
  consoleSink: Logger = createConsoleLogSink(),
): Logger {
  const write = (
    level: keyof Logger,
    event: Parameters<Logger["info"]>[0],
    context?: LogContext,
  ) => {
    try {
      consoleSink[level](event, context);
    } catch {
      // 本地输出故障不能阻止远程输出。
    }
    try {
      sink[level](event, toAttributes(context));
    } catch {
      // 任一观测输出故障不能影响业务，也不递归记录自身异常。
    }
  };
  return {
    info: (event, context) => write("info", event, context),
    warn: (event, context) => write("warn", event, context),
    error: (event, context) => write("error", event, context),
  };
}
function toAttributes(context: LogContext = {}): LogAttributes {
  return {
    ...Object.fromEntries(
      Object.entries(context).map(([key, value]) => [
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
