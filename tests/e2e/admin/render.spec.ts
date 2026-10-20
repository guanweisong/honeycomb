import type { Page } from "@playwright/test";
import { test, expect } from "./render-fixture";

const postId = "000000000000000000000005";
const pageId = "000000000000000000000006";

async function visit(page: Page, path: string, procedures: string[] = []) {
  const reads = procedures.map((procedure) =>
    page.waitForResponse((response) => {
      const pathname = new URL(response.url()).pathname;
      if (procedure.startsWith("/api/auth/")) return pathname === procedure;
      return (
        pathname.startsWith("/api/trpc/") &&
        pathname.slice("/api/trpc/".length).split(",").includes(procedure)
      );
    }),
  );
  await page.goto(path);
  for (const response of await Promise.all(reads)) {
    expect(response.ok(), response.url()).toBe(true);
    const body = await response.json();
    if (new URL(response.url()).pathname.startsWith("/api/auth/")) {
      expect(Array.isArray(body), response.url()).toBe(true);
      continue;
    }
    for (const result of Array.isArray(body) ? body : [body]) {
      expect(result, response.url()).not.toHaveProperty("error");
      expect(result, response.url()).toHaveProperty("result.data");
    }
  }
  await expect(page).toHaveURL(
    new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
  );
}

async function healthyPage(page: Page) {
  await expect(
    page.getByText("后台暂时无法加载。", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "无权访问" })).toHaveCount(0);
  await expect(
    page.getByText("数据加载失败，请重试", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "登录", exact: true }),
  ).toHaveCount(0);
}

test.describe("@smoke admin page rendering with real local reads", () => {
  // Keep one password sign-in for this read-only group even when the suite is
  // fully parallel; production auth intentionally rate-limits sign-in bursts.
  test.describe.configure({ mode: "default" });
  test.afterEach(async ({ page }) => healthyPage(page));

  test("dashboard", async ({ page }) => {
    await visit(page, "/admin/dashboard", ["statistic.index"]);
    await expect(page.getByTestId("admin-page-title")).toHaveText("控制台");
    await expect(page.getByText("贡献", { exact: true })).toBeVisible();
    await expect(page.getByTestId("custom-pie-loading-skeleton")).toHaveCount(
      0,
    );
    // Legend icons also use recharts-surface; only direct children are charts.
    const charts = page.locator(".recharts-wrapper > svg.recharts-surface");
    await expect(charts).toHaveCount(4);
    for (const chart of await charts.all()) await expect(chart).toBeVisible();
  });

  const lists = [
    {
      path: "post/list",
      title: "文章列表",
      column: "引用内容",
      procedure: "post.adminIndex",
    },
    {
      path: "post/category",
      title: "分类目录",
      column: "分类名称",
      procedure: "category.adminTree",
    },
    {
      path: "page/list",
      title: "页面列表",
      column: "模板",
      procedure: "page.adminIndex",
    },
    {
      path: "comment",
      title: "评论",
      column: "评论内容",
      procedure: "comment.index",
    },
    { path: "tag", title: "标签", column: "标签名称", procedure: "tag.index" },
    {
      path: "user",
      title: "用户",
      column: "用户邮箱",
      procedure: "user.index",
    },
    {
      path: "link",
      title: "友情链接",
      column: "链接名称",
      procedure: "link.adminIndex",
    },
  ];
  for (const { path, title, column, procedure } of lists) {
    test(path, async ({ page }) => {
      await visit(page, `/admin/${path}`, [procedure]);
      await expect(page.getByTestId("admin-page-title")).toHaveText(title);
      await expect(
        page.getByRole("columnheader", { name: column, exact: true }),
      ).toBeVisible();
      // A real row OR the legitimate empty-state row is valid. A loading-only
      // table, failed read, missing table, or missing route-specific column isn't.
      await expect(page.getByRole("table").locator("tbody")).not.toHaveText("");
      await expect(
        page.getByText("正在加载中...", { exact: true }),
      ).toHaveCount(0);
    });
  }

  for (const kind of ["post", "page"] as const) {
    for (const editing of [false, true]) {
      test(`${kind} ${editing ? "edit" : "create"}`, async ({ page }) => {
        const id = kind === "post" ? postId : pageId;
        const noun = kind === "post" ? "文章" : "页面";
        const procedures = kind === "post" ? ["category.adminTree"] : [];
        if (editing) procedures.push(`${kind}.adminDetail`);
        await visit(
          page,
          `/admin/${kind}/edit${editing ? `?id=${id}` : ""}`,
          procedures,
        );
        await expect(page.getByTestId("admin-page-title")).toHaveText(
          `${editing ? "修改" : "添加新"}${noun}`,
        );
        const title = page.getByPlaceholder(`在此输入${noun}标题`);
        await expect(title).toBeEditable();
        await expect(
          page.locator(".prose-editor [contenteditable=true]"),
        ).toBeVisible();
        if (editing) {
          await expect(title).toHaveValue(
            kind === "post" ? "可靠浏览器门禁" : "关于",
          );
          await expect(
            page.locator(".prose-editor [contenteditable=true]"),
          ).toContainText(
            kind === "post" ? "确定性浏览器测试内容。" : "关于 E2E 站点。",
          );
        } else {
          await expect(title).toHaveValue("");
          await expect(
            page.getByRole("button", { name: "保存草稿", exact: true }),
          ).toBeEnabled();
        }
      });
    }
  }

  test("media (seeded cover renders)", async ({ page }) => {
    await visit(page, "/admin/media", ["media.index"]);
    await expect(
      page.getByRole("button", { name: "点击上传文件" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Search cover fixture", exact: true }),
    ).toBeVisible();
  });

  test("menu", async ({ page }) => {
    await visit(page, "/admin/menu", [
      "category.adminTree",
      "page.adminIndex",
      "menu.adminIndex",
    ]);
    await expect(page.getByText("可选菜单项", { exact: true })).toBeVisible();
    await expect(page.getByText("菜单结构", { exact: true })).toBeVisible();
    await expect(page.locator(".menu-tree")).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "分类", exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "页面", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toContainText("关于");
  });

  test("site settings", async ({ page }) => {
    await visit(page, "/admin/setting");
    await expect(page.getByPlaceholder("请填写站点名称")).toHaveValue(
      "蜂巢 E2E",
    );
    await expect(page.getByPlaceholder("请填写副标题")).toHaveValue(
      "可靠浏览器门禁",
    );
    await expect(page.getByPlaceholder("请填写备案号")).toBeEditable();
  });

  const securityTabs = [
    {
      tab: "passkey",
      name: "Passkey",
      reads: ["/api/auth/passkey/list-user-passkeys"],
    },
    { tab: "password", name: "修改密码", reads: [] },
    { tab: "sessions", name: "登录会话", reads: ["/api/auth/list-sessions"] },
    {
      tab: "linked-accounts",
      name: "关联账号",
      reads: ["/api/auth/list-accounts"],
    },
    {
      tab: "login-history",
      name: "登录历史",
      reads: ["accountSecurity.loginHistory"],
    },
  ];
  for (const { tab, name, reads } of securityTabs) {
    test(`account security ${tab}`, async ({ page }) => {
      await visit(
        page,
        `/admin/account/security${tab === "passkey" ? "" : `?tab=${tab}`}`,
        reads,
      );
      await expect(
        page.getByRole("tab", { name, exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      const panel = page.getByRole("tabpanel");
      if (tab === "passkey")
        await expect(panel.getByTestId("passkey-name-input")).toBeVisible();
      if (tab === "password") {
        await expect(panel.getByTestId("current-password-input")).toBeVisible();
        await expect(panel.getByTestId("new-password-input")).toBeVisible();
        await expect(panel.getByTestId("confirm-password-input")).toBeVisible();
      }
      if (tab === "sessions") {
        await expect(
          panel.getByTestId("revoke-other-sessions-button"),
        ).toBeVisible();
        await expect(panel.locator("li").first()).toBeVisible();
      }
      if (tab === "linked-accounts")
        await expect(
          panel.getByText("管理用于登录当前账号的第三方账号。", {
            exact: true,
          }),
        ).toBeVisible();
      if (tab === "login-history")
        await expect(
          panel.getByText("登录成功", { exact: true }).first(),
        ).toBeVisible();
    });
  }

  for (const [entry, target, title] of [
    ["/admin", "/admin/dashboard", "控制台"],
    ["/admin/post", "/admin/post/list", "文章列表"],
    ["/admin/page", "/admin/page/list", "页面列表"],
  ] as const) {
    test(`redirect ${entry}`, async ({ page }) => {
      await page.goto(entry);
      await expect(page).toHaveURL(new RegExp(`${target}$`));
      await expect(page.getByTestId("admin-page-title")).toHaveText(title);
    });
  }
});

test.describe("@smoke admin public pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("login", async ({ page }) => {
    await visit(page, "/admin/login");
    await expect(
      page.getByPlaceholder("用户名", { exact: true }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("密码", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "登录", exact: true }),
    ).toBeVisible();
  });
  test("forbidden", async ({ page }) => {
    await visit(page, "/admin/forbidden");
    await expect(page.getByRole("heading", { name: "无权访问" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "返回后台首页" }),
    ).toHaveAttribute("href", "/admin/dashboard");
  });
});
