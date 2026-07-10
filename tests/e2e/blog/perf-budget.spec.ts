import { test, expect } from "@playwright/test";
import { openBlogHome } from "./helpers";

function getThreshold(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function metricValue(
  metrics: Array<{ name: string; value: number }>,
  name: string,
): number {
  return metrics.find((m) => m.name === name)?.value ?? 0;
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
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    });

    const firstPost = page.locator('a[href*="/en/archives/"]').first();
    if (await firstPost.count()) {
      await firstPost.click();
      await expect(page).toHaveURL(/\/en\/archives\//);
      await page.goBack({ waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/en\/list\/category/);
    }

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

    const cpuPercent =
      ((finalTaskDuration - baselineTaskDuration) / wallSec) * 100;
    const heapUsedMB = finalHeapUsed / (1024 * 1024);
    const heapDeltaMB = (finalHeapUsed - baselineHeapUsed) / (1024 * 1024);

    expect(cpuPercent).toBeLessThan(maxCpuPercent);
    expect(heapUsedMB).toBeLessThan(maxHeapUsedMB);
    expect(heapDeltaMB).toBeLessThan(maxHeapDeltaMB);
    expect(domNodes).toBeLessThan(maxDomNodes);
  });
});
