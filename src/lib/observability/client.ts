import { createConsoleLogger } from "./adapters/console";

export const clientLogger = createConsoleLogger({
  service: "honeycomb-client",
});
