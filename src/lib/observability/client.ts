import { createConsoleLogSink } from "@/lib/observability/adapters/console";

import { createSafeLogger } from "@/lib/observability/core/safe-adapters";

export const clientLogger = createSafeLogger(
  createConsoleLogSink({
    service: "honeycomb-client",
  }),
);
