import { createConsoleLogger } from "@/lib/observability/adapters/console";

export const clientLogger = createConsoleLogger({
  service: "honeycomb-client",
});
