import { test, expect } from "@playwright/test";
import { openBlogHome } from "./helpers";

test.describe("blog search", () => {
  test("@regression searches body text, opens a result, and restores focus after dismissal", async ({
    page,
  }) => {
    await openBlogHome(page);
    const trigger = page.getByRole("button", { name: "Search", exact: true });
    const iconBoxes = await Promise.all([
      page.getByTestId("theme-switcher").first().locator("svg").boundingBox(),
      page
        .getByRole("link", { name: "Switch to 中文" })
        .locator("img")
        .boundingBox(),
      trigger.locator("svg").boundingBox(),
    ]);
    expect(iconBoxes.every(Boolean)).toBe(true);
    const centers = iconBoxes.map((box) => box!.y + box!.height / 2);
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(1);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Search", exact: true });
    const input = dialog.getByRole("searchbox");
    await expect(input).toBeFocused();
    await input.fill("Deterministic browser test content");
    const result = dialog.getByRole("link", { name: /Reliable browser gates/ });
    await expect(result).toBeVisible();
    await expect(result).toContainText("Movie");
    await expect(result.locator("img")).toHaveCount(0);
    const cover = dialog
      .getByRole("link", { name: /Search cover fixture/ })
      .locator("img");
    await expect(cover).toBeVisible();
    await expect
      .poll(() =>
        cover.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(result).toContainText("Deterministic browser test content.");
    await input.press("Tab");
    await expect(result).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/en\/archives\/000000000000000000000005$/);
    await expect(dialog).toHaveCount(0);

    await trigger.click();
    await expect(input).toHaveValue("");
    await input.fill("可靠浏览器门禁");
    await expect(dialog.getByText("No matching content found")).toBeVisible();
    await input.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("@regression mobile search fills the viewport and supports Chinese results", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/zh/list/category", { waitUntil: "domcontentloaded" });
    const trigger = page.getByRole("button", { name: "搜索", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "搜索", exact: true });
    await expect(dialog).toBeVisible();
    await expect(async () => {
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeCloseTo(0, 0);
      expect(box!.y).toBeCloseTo(0, 0);
      expect(box!.width).toBeCloseTo(390, 0);
      expect(box!.height).toBeCloseTo(844, 0);
    }).toPass({ timeout: 5_000 });
    await dialog.getByRole("searchbox").fill("确定性浏览器测试内容");
    await expect(
      dialog.getByRole("link", { name: /可靠浏览器门禁/ }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "关闭搜索" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
