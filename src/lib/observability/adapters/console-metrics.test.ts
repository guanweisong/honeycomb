// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { MetricName } from "@/lib/observability/core/names";
import { createConsoleMetricSink } from "@/lib/observability/adapters/console-metrics";

import { createSafeMetrics } from "@/lib/observability/core/safe-adapters";

describe("console metrics", () => {
  it("timestamps metrics without reading the wall clock", () => {
    const write = vi.fn();
    const metrics = createConsoleMetricSink({ write });
    const originalDate = globalThis.Date;
    const wallClockUnavailable = new Error(
      "Wall-clock time is unavailable during prerendering",
    );
    const now = vi.spyOn(originalDate, "now").mockImplementation(() => {
      throw wallClockUnavailable;
    });
    class DateWithoutWallClock extends originalDate {
      constructor(...args: [] | [value: string | number | Date]) {
        if (args.length === 0) {
          throw wallClockUnavailable;
        }
        super(args[0] ?? Number.NaN);
      }
    }
    vi.stubGlobal("Date", DateWithoutWallClock);

    try {
      metrics.increment(MetricName.apiRequestsTotal);
    } finally {
      vi.stubGlobal("Date", originalDate);
      now.mockRestore();
    }

    expect(JSON.parse(write.mock.calls[0]?.[0] ?? "{}").timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("输出包含稳定运行时字段的 counter 与 duration JSON", () => {
    const lines: string[] = [];
    const metrics = createSafeMetrics(
      createConsoleMetricSink({
        service: "honeycomb-test",
        environment: "test",
        write: (line) => lines.push(line),
      }),
    );

    metrics.increment(MetricName.apiRequestsTotal, { method: "query" });
    metrics.recordDuration(MetricName.apiRequestDurationMs, 12, {
      outcome: "success",
    });

    expect(lines.map((line) => JSON.parse(line))).toEqual([
      expect.objectContaining({
        type: "metric",
        name: MetricName.apiRequestsTotal,
        operation: "increment",
        value: 1,
        unit: "count",
        service: "honeycomb-test",
        environment: "test",
        labels: { method: "query" },
      }),
      expect.objectContaining({
        type: "metric",
        name: MetricName.apiRequestDurationMs,
        operation: "record-duration",
        value: 12,
        unit: "ms",
        labels: { outcome: "success" },
      }),
    ]);
    expect(
      lines.every((line) => typeof JSON.parse(line).timestamp === "string"),
    ).toBe(true);
  });

  it("丢弃非法标签和值且不泄露敏感字段", () => {
    const write = vi.fn();
    const metrics = createSafeMetrics(createConsoleMetricSink({ write }));

    metrics.increment(MetricName.apiErrorsTotal, {
      procedure: "private-user-id",
      token: "secret-token",
      method: "mutation",
    });

    expect(JSON.parse(write.mock.calls[0]?.[0] ?? "{}").labels).toEqual({
      method: "mutation",
    });
    expect(write.mock.calls[0]?.[0]).not.toContain("private-user-id");
    expect(write.mock.calls[0]?.[0]).not.toContain("secret-token");
  });

  it("writer 抛错时保持 fail-open", () => {
    const metrics = createSafeMetrics(
      createConsoleMetricSink({
        write: () => {
          throw new Error("stdout unavailable");
        },
      }),
    );

    expect(() => metrics.increment(MetricName.apiErrorsTotal)).not.toThrow();
    expect(() =>
      metrics.recordDuration(MetricName.apiRequestDurationMs, 1),
    ).not.toThrow();
  });
});
