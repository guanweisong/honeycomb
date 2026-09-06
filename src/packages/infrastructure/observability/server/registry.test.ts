import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemoryObservability } from "../adapters/memory";
import type { Logger, Metrics } from "../core/contracts";
import { LogEvent, MetricName } from "../core/names";
import { configureObservability, getLogger, getMetrics } from "./registry";

describe("observability server registry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    configureObservability();
  });

  it("returns the configured logger and metrics adapters", () => {
    const memory = createMemoryObservability();

    configureObservability({ logger: memory.logger, metrics: memory.metrics });
    getLogger().info(LogEvent.requestStarted, { requestId: "req-configured" });
    getMetrics().increment(MetricName.apiRequestsTotal, {
      procedure: "post.index",
    });

    expect(memory.logEvents).toEqual([
      {
        level: "info",
        event: LogEvent.requestStarted,
        context: { requestId: "req-configured" },
      },
    ]);
    expect(memory.metricEvents).toEqual([
      {
        type: "increment",
        name: MetricName.apiRequestsTotal,
        labels: { procedure: "post.index" },
      },
    ]);
  });

  it("restores structured console logger and metrics by default", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);

    configureObservability();
    getLogger().info(LogEvent.requestStarted, { requestId: "req-default" });
    getMetrics().recordDuration(MetricName.apiRequestDurationMs, 23, {
      method: "query",
    });

    expect(output).toHaveBeenCalledTimes(2);
    expect(JSON.parse(output.mock.calls[0]?.[0] ?? "{}")).toMatchObject({
      event: LogEvent.requestStarted,
      requestId: "req-default",
    });
    expect(JSON.parse(output.mock.calls[1]?.[0] ?? "{}")).toMatchObject({
      type: "metric",
      name: MetricName.apiRequestDurationMs,
      operation: "record-duration",
      value: 23,
      unit: "ms",
      service: "honeycomb",
      labels: { method: "query" },
    });
  });

  it("drops unknown and high-cardinality labels from default metrics", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);

    configureObservability();
    getMetrics().increment(MetricName.apiRequestsTotal, {
      procedure: "attacker-controlled",
      token: "secret-token",
    });

    expect(output).toHaveBeenCalledOnce();
    expect(JSON.parse(output.mock.calls[0]?.[0] ?? "{}")).toMatchObject({
      type: "metric",
      name: MetricName.apiRequestsTotal,
      operation: "increment",
      value: 1,
      unit: "count",
      labels: {},
    });
    expect(output.mock.calls[0]?.[0]).not.toContain("secret-token");
    expect(output.mock.calls[0]?.[0]).not.toContain("attacker-controlled");
  });

  it("keeps callers running when the default metric writer throws", () => {
    vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("stdout unavailable");
    });

    configureObservability();

    expect(() =>
      getMetrics().increment(MetricName.apiErrorsTotal),
    ).not.toThrow();
  });

  it("keeps callers running when a configured adapter throws", () => {
    const failingLogger: Logger = {
      info: () => {
        throw new Error("logger unavailable");
      },
      warn: () => {
        throw new Error("logger unavailable");
      },
      error: () => {
        throw new Error("logger unavailable");
      },
    };
    const failingMetrics: Metrics = {
      increment: () => {
        throw new Error("metrics unavailable");
      },
      recordDuration: () => {
        throw new Error("metrics unavailable");
      },
    };

    configureObservability({ logger: failingLogger, metrics: failingMetrics });

    expect(() => getLogger().error(LogEvent.serverError)).not.toThrow();
    expect(() =>
      getMetrics().increment(MetricName.apiErrorsTotal),
    ).not.toThrow();
  });
});
