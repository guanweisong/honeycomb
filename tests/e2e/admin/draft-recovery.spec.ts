import { test, expect } from "@tests/e2e/admin/render-fixture";

test.describe("@regression local editor draft recovery", () => {
  test.describe.configure({ mode: "default" });
  for (const [kind, placeholder] of [
    ["post", "在此输入文章标题"],
    ["page", "在此输入页面标题"],
  ] as const) {
    test(`${kind}: nonexistent editor offers return instead of loading forever`, async ({
      page,
    }) => {
      await page.goto(`/admin/${kind}/edit?id=999999999999999999999999`);
      // The post query retries transient errors with 1s/2s/4s backoff.
      // Scope to our alert, not Next.js's separate route announcer.
      await expect(page.locator('section[role="alert"]')).toContainText(
        "不存在或已被删除",
        { timeout: 15_000 },
      );
      await expect(
        page.getByRole("link", {
          name: kind === "post" ? "返回文章列表" : "返回页面列表",
        }),
      ).toBeVisible();
      await expect(page.getByPlaceholder(placeholder)).toHaveCount(0);
    });
    test(`${kind}: reload offers restore or discard without publishing`, async ({
      page,
    }) => {
      const writes: string[] = [];
      page.on("request", (request) => {
        if (request.method() === "POST" && /\/api\/trpc\//.test(request.url()))
          writes.push(request.url());
      });
      page.on("dialog", (dialog) => dialog.accept());
      await page.goto(`/admin/${kind}/edit`);
      // Header actions are installed in a client effect, after editor hydration.
      await expect(
        page.getByRole("button", { name: "保存草稿", exact: true }),
      ).toBeEnabled();
      const title = page.getByPlaceholder(placeholder);
      await title.fill("浏览器未保存草稿");
      await expect(title).toHaveValue("浏览器未保存草稿");
      await expect
        .poll(() =>
          page.evaluate(
            (entity) =>
              Object.keys(localStorage).some(
                (key) =>
                  key.startsWith(`honeycomb:draft:${entity}:`) &&
                  localStorage.getItem(key)?.includes("浏览器未保存草稿"),
              ),
            kind,
          ),
        )
        .toBe(true);
      await page.reload();
      await expect(
        page.getByRole("button", { name: "恢复草稿", exact: true }),
      ).toBeVisible();
      await expect(title).toHaveValue("");
      await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
      await expect(title).toHaveValue("浏览器未保存草稿");
      await page.reload();
      const readNewDrafts = () =>
        page.evaluate(
          (entity) =>
            Object.keys(localStorage)
              .filter(
                (key) =>
                  key.startsWith(`honeycomb:draft:${entity}:`) &&
                  key.endsWith(":new"),
              )
              .map((key) => ({ key, raw: localStorage.getItem(key) })),
          kind,
        );
      expect(await readNewDrafts()).toHaveLength(1);
      await page.getByRole("button", { name: "丢弃草稿", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "恢复草稿", exact: true }),
      ).toHaveCount(0);
      await expect(title).toHaveValue("");
      // Distinguish failed removal from a blank draft rewritten by pagehide.
      expect(await readNewDrafts()).toEqual([]);
      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      expect(await readNewDrafts()).toEqual([]);
      await page.reload();
      await expect(title).toBeVisible();
      await expect(
        page.getByRole("button", { name: "保存草稿", exact: true }),
      ).toBeEnabled();
      expect(await readNewDrafts()).toEqual([]);
      await expect(
        page.getByRole("button", { name: "恢复草稿", exact: true }),
      ).toHaveCount(0);
      expect(writes).toEqual([]);
    });
  }
});
