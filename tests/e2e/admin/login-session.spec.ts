import { expect, test } from "@playwright/test";
import { assertSafeE2ESeedTarget } from "../../../scripts/e2e-seed-policy";

test("@regression login form establishes a real session used by protected navigation", async ({
  page,
  context,
  baseURL,
}) => {
  assertSafeE2ESeedTarget(process.env);
  if (
    !baseURL ||
    !["127.0.0.1", "localhost", "[::1]"].includes(new URL(baseURL).hostname)
  ) {
    throw new Error(
      "Interactive login regression requires a local test server",
    );
  }
  // Only the third-party widget is a fixture. Credential transport, cookies,
  // session lookup, Server Component authorization and the destination are real.
  await page.addInitScript(() => {
    Object.defineProperty(window, "turnstile", {
      value: {
        ready: (callback: () => void) => callback(),
        render: (
          _element: unknown,
          options: { callback?: (token: string) => void },
        ) => {
          setTimeout(() => options.callback?.("XXXX.DUMMY.TOKEN.XXXX"), 0);
          return "fixture-widget";
        },
        reset: () => {},
        remove: () => {},
        getResponse: () => "XXXX.DUMMY.TOKEN.XXXX",
      },
    });
  });
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByTestId("admin-sidebar")).toHaveCount(0);
  const login = page.getByRole("button", { name: "登录", exact: true });
  await expect(login).toBeEnabled();
  await page.getByLabel("用户名", { exact: true }).fill("page-smoke-admin");
  await page.getByLabel("密码", { exact: true }).fill("page-smoke-test-only");
  const signedIn = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/auth/sign-in/username" &&
      response.request().method() === "POST",
  );
  await login.click();
  expect((await signedIn).ok()).toBe(true);
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByTestId("admin-sidebar")).toBeVisible();
  await expect(page.getByTestId("admin-page-title")).toHaveText("控制台");
  // Assert presence and cookie security, never print a session credential.
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name.endsWith("session_token") && cookie.httpOnly,
    ),
  ).toBe(true);
  const session = await context.request.get("/api/auth/get-session");
  await expect(session).toBeOK();
  expect((await session.json()).user.username).toBe("page-smoke-admin");
  await page.reload();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByTestId("admin-sidebar")).toBeVisible();
  await expect(page.getByTestId("admin-page-title")).toHaveText("控制台");
});
