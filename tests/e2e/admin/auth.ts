import { expect, type Page } from "@playwright/test";

/** 建立真实服务端会话，让后台 E2E 能越过 Server Component 鉴权。 */
export async function signInAsDashboardTestUser(page: Page) {
  await page.clock.install();
  const response = await page.context().request.post(
    "/api/auth/sign-in/username",
    {
      data: {
        username: process.env.E2E_ADMIN_USERNAME ?? "guest",
        password: process.env.E2E_ADMIN_PASSWORD ?? "123456",
      },
      headers: {
        "x-captcha-response": "XXXX.DUMMY.TOKEN.XXXX",
      },
    },
  );

  await expect(response).toBeOK();
}

/**
 * 服务端会话使用只读 guest；浏览器契约随后用 mock ADMIN 响应验证写入 UI。
 * 快进查询时钟后触发聚焦，避免测试依赖真实的 30 秒 staleTime。
 */
export async function refreshMockedAdminUser(page: Page) {
  await page.clock.fastForward(31_000);
  await page.context().setOffline(true);
  await page.context().setOffline(false);
}
