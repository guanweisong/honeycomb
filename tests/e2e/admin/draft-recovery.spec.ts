import { test, expect } from "./render-fixture";

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
      await expect(page.getByRole("alert")).toContainText("不存在或已被删除");
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
      const title = page.getByPlaceholder(placeholder);
      await title.fill("浏览器未保存草稿");
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
      await page.getByRole("button", { name: "丢弃草稿", exact: true }).click();
      await expect(title).toHaveValue("");
      await page.reload();
      await expect(title).toBeVisible();
      await expect(
        page.getByRole("button", { name: "恢复草稿", exact: true }),
      ).toHaveCount(0);
      expect(writes).toEqual([]);
    });
  }
});
