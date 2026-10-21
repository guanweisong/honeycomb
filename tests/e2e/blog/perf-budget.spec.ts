import { test, expect } from "@playwright/test";
import { availableParallelism, totalmem } from "node:os";
import {
  metricValue,
  taskDurationDelta,
} from "../../helpers/performance-metrics";
import { openBlogHome } from "./helpers";

function getThreshold(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

test.describe("blog performance budget", () => {
  test("@performance cpu and memory should stay within budget", async ({
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

    const baselinePerf = await cdp.send("Performance.getMetrics");
    const baselineTaskDuration = metricValue(
      baselinePerf.metrics,
      "TaskDuration",
    );
    const baselineHeapUsed = metricValue(
      baselinePerf.metrics,
      "JSHeapUsedSize",
    );
    const wallStart = Date.now();

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
    await firstPost.click();
    await expect(page).toHaveURL(/\/en\/archives\//);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.locator("main").getByRole("heading").first(),
    ).toBeVisible();
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/list\/category/);
    await expect(firstPost).toBeVisible();

    const wallSec = Math.max((Date.now() - wallStart) / 1000, 0.001);
    const finalPerf = await cdp.send("Performance.getMetrics");

    const finalTaskDuration = metricValue(finalPerf.metrics, "TaskDuration");
    const finalHeapUsed = metricValue(finalPerf.metrics, "JSHeapUsedSize");
    const domNodes = await page.evaluate(() => {
      const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
      let count = 1;
      while (walker.nextNode()) count += 1;
      return count;
    });

    expect(finalTaskDuration).toBeGreaterThanOrEqual(baselineTaskDuration);
    const taskSeconds = taskDurationDelta(
      baselineTaskDuration,
      finalTaskDuration,
    );
    const cpuPercent = (taskSeconds / wallSec) * 100;
    const heapUsedMB = finalHeapUsed / (1024 * 1024);
    const heapDeltaMB = (finalHeapUsed - baselineHeapUsed) / (1024 * 1024);

    const measurement = {
      phase: "scroll-detail-back",
      taskSeconds,
      wallSec,
      cpuPercent,
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
    // Record absolute work now; establish any new blocking budget from
    // repeated samples on the same CI machine and build mode, not a guess.
    expect(cpuPercent).toBeLessThan(maxCpuPercent);
    expect(heapUsedMB).toBeLessThan(maxHeapUsedMB);
    expect(heapDeltaMB).toBeLessThan(maxHeapDeltaMB);
    expect(domNodes).toBeLessThan(maxDomNodes);
  });
});
