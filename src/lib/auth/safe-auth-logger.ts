import "server-only";

import type { BetterAuthOptions } from "better-auth";
import { LogEvent } from "@/lib/observability/core/names";
import { getLogger } from "@/lib/observability/server/registry";

function knownCode(value: unknown) {
  switch (value) {
    case "HANGING_PROMISE_REJECTION":
    case "SQLITE_BUSY":
    case "SQLITE_BUSY_SNAPSHOT":
    case "INTERNAL_SERVER_ERROR":
      return value;
    default:
      return undefined;
  }
}

function diagnosticCode(message: string, args: unknown[]): string {
  let code = knownCode(message);
  const seen = new WeakSet<object>();
  for (let value of args.slice(0, 4)) {
    for (
      let depth = 0;
      depth < 4 && value !== null && typeof value === "object";
      depth++
    ) {
      if (seen.has(value)) break;
      seen.add(value);
      try {
        // Read data properties only: never invoke an error's getters or serializer.
        code =
          knownCode(Object.getOwnPropertyDescriptor(value, "code")?.value) ??
          knownCode(Object.getOwnPropertyDescriptor(value, "digest")?.value) ??
          code;
        value = Object.getOwnPropertyDescriptor(value, "cause")?.value;
      } catch {
        break;
      }
    }
  }
  return code ?? "UNKNOWN";
}

/** SDK text/arguments may contain credentials; emit only fixed, finite diagnostics. */
export const safeAuthLogger = {
  log(severity, message, ...args: unknown[]) {
    try {
      const logger = getLogger();
      const method =
        severity === "error" || severity === "warn" ? severity : "info";
      logger[method](LogEvent.serverError, {
        operation: "better-auth",
        diagnosticCode: diagnosticCode(message, args),
      });
    } catch {
      // Only diagnostics are fail-open; the SDK still owns authentication errors.
    }
  },
} satisfies NonNullable<BetterAuthOptions["logger"]>;
