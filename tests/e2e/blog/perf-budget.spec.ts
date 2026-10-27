import { test, expect } from "@playwright/test";
import { availableParallelism, totalmem } from "node:os";
import { setTimeout as sampleFor } from "node:timers/promises";
import {
  metricValue,
  taskDurationSegment,
} from "@tests/helpers/performance-metrics";
import { openBlogHome } from "@tests/e2e/blog/helpers";

function getThreshold(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

test.describe("blog performance budget", () => {
  test("@performance steady-state cpu and memory should stay within budget", async ({
    page,
    context,
  }) => {
    const maxCpuPercent = getThreshold("E2E_PERF_MAX_CPU_PERCENT", 70);
    const maxHeapUsedMB = getThreshold("E2E_PERF_MAX_HEAP_USED_MB", 512);
    const maxHeapDeltaMB = getThreshold("E2E_PERF_MAX_HEAP_DELTA_MB", 128);
    const maxDomNodes = getThreshold("E2E_PERF_MAX_DOM_NODES", 2500);

    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");

    await openBlogHome(page);

    function sample(metrics: Array<{ name: string; value: number }>) {
      return {
        navigationStart: metricValue(metrics, "NavigationStart"),
        timestamp: metricValue(metrics, "Timestamp"),
        taskDuration: metricValue(metrics, "TaskDuration"),
      };
    }
    const baselinePerf = await cdp.send("Performance.getMetrics");
    const homeReady = sample(baselinePerf.metrics);
    const baselineHeapUsed = metricValue(
      baselinePerf.metrics,
      "JSHeapUsedSize",
    );

    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
    });
    await page.waitForFunction(
      () =>
        Math.abs(
          window.scrollY -
            Math.max(
              0,
              document.documentElement.scrollHeight - window.innerHeight,
            ),
        ) <= 1,
    );
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    });

    await page.waitForFunction(() => window.scrollY === 0);

    const firstPost = page.locator('a[href*="/en/archives/"]').first();
    await expect(firstPost).toBeVisible();
    const afterScroll = sample(
      (await cdp.send("Performance.getMetrics")).metrics,
    );
    await firstPost.click();
    await expect(page).toHaveURL(/\/en\/archives\//);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.locator("main").getByRole("heading").first(),
    ).toBeVisible();
    const detailReady = sample(
      (await cdp.send("Performance.getMetrics")).metrics,
    );
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/list\/category/);
    await expect(firstPost).toBeVisible();

    const finalPerf = await cdp.send("Performance.getMetrics");
    const returnedReady = sample(finalPerf.metrics);
    const activeSegments = [
      { phase: "scroll", ...taskDurationSegment(homeReady, afterScroll) },
      {
        phase: "detail-navigation",
        ...taskDurationSegment(afterScroll, detailReady),
      },
      {
        phase: "back-navigation",
        ...taskDurationSegment(detailReady, returnedReady),
      },
    ];
    const finalHeapUsed = metricValue(finalPerf.metrics, "JSHeapUsedSize");
    const domNodes = await page.evaluate(() => {
      const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
      let count = 1;
      while (walker.nextNode()) count += 1;
      return count;
    });

    // This is a separate sustained-work sample, not settling time appended to
    // the active interaction denominator. Navigation/scroll work stays above.
    const steadyStateSampleMs = 1000;
    const steadyStateBefore = sample(
      (await cdp.send("Performance.getMetrics")).metrics,
    );
    await sampleFor(steadyStateSampleMs);
    const steadyState = taskDurationSegment(
      steadyStateBefore,
      sample((await cdp.send("Performance.getMetrics")).metrics),
    );
    const heapUsedMB = finalHeapUsed / (1024 * 1024);
    const heapDeltaMB = (finalHeapUsed - baselineHeapUsed) / (1024 * 1024);

    const measurement = {
      measurementVersion: 2,
      phase: "scroll-detail-back",
      activeMetric: "same-document-main-thread-task-seconds",
      activeSegments,
      // Cross-document segments retain raw counters but have no inferred delta:
      // this is deliberately not a claimed total of all navigation CPU work.
      activeTaskCoverage: "same-document-segments-only",
      steadyStateMetric: "post-interaction-main-thread-task-percent",
      steadyStateSampleMs,
      steadyStateMaxPercent: maxCpuPercent,
      steadyState,
      heapUsedMB,
      heapDeltaMB,
      domNodes,
      browser: await page.evaluate(() => navigator.userAgent),
      buildMode:
        process.env.PLAYWRIGHT_USE_DEV_SERVER === "1"
          ? "development"
          : "production",
      machine: {
        platform: process.platform,
        architecture: process.arch,
        node: process.versions.node,
        parallelism: availableParallelism(),
        memoryBytes: totalmem(),
      },
    };
    // CI deletes the owned test directory, including attachments. Keep this
    // fixed, non-sensitive measurement in job logs for later baseline work.
    console.info(`interaction-resource-smoke ${JSON.stringify(measurement)}`);
    await test.info().attach("interaction-resource-smoke.json", {
      contentType: "application/json",
      body: JSON.stringify(measurement, null, 2),
    });
    // Active bursts need their own measured baseline. The existing CPU ceiling
    // is now a separately labeled sustained-work gate, not comparable with
    // the previous active-plus-waits ratio.
    expect(steadyState.kind).toBe("same-document");
    if (steadyState.kind !== "same-document") {
      throw new Error("Document changed during the steady-state CPU sample");
    }
    expect(steadyState.cpuPercent).toBeLessThan(maxCpuPercent);
    expect(heapUsedMB).toBeLessThan(maxHeapUsedMB);
    expect(heapDeltaMB).toBeLessThan(maxHeapDeltaMB);
    expect(domNodes).toBeLessThan(maxDomNodes);
  });
});
