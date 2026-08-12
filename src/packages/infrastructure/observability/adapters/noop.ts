import type { Metrics } from "../core/contracts";

export const noopMetrics: Metrics = {
  increment: () => undefined,
  recordDuration: () => undefined,
};
