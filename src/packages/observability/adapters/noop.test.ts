import { describe, expect, it } from "vitest";

import { MetricName } from "../core/names";
import { noopMetrics } from "./noop";

describe("noopMetrics", () => {
  it("accepts supported metrics without producing a result", () => {
    expect(() => {
      noopMetrics.increment(MetricName.cacheOperationsTotal, {
        namespace: "post.index",
        operation: "read",
        outcome: "success",
      });
      noopMetrics.recordDuration(MetricName.apiRequestDurationMs, 7, {
        procedure: "post.index",
        outcome: "success",
      });
    }).not.toThrow();
  });
});
