import { expect, test } from "@playwright/test";
import { signInAsDashboardTestUser } from "./admin/auth";

const postId = "000000000000000000000005";

test("@regression public comments redact moderated content on the wire and retain replies", async ({
  request,
  page,
}) => {
  const response = await request.get("/api/trpc/comment.listByRef", {
    params: { input: JSON.stringify({ id: postId, type: "CATEGORY" }) },
  });
  await expect(response).toBeOK();
  const body = await response.text();
  expect(body).toContain('"content":""');
  expect(body).toContain("Visible reply beneath moderated parent");
  for (const secret of [
    "PRIVATE_BANNED_COMMENT_SENTINEL",
    "private-comment@honeycomb.test",
    "192.0.2.10",
    "PRIVATE_AGENT_SENTINEL",
  ]) {
    expect(body).not.toContain(secret);
  }
  const document = await page.goto(`/en/archives/${postId}`);
  expect(await document?.text()).not.toContain(
    "PRIVATE_BANNED_COMMENT_SENTINEL",
  );
  await expect(
    page.getByText("Visible reply beneath moderated parent", { exact: true }),
  ).toBeVisible();
});

test("@regression root category includes a post in its grandchild", async ({
  page,
  request,
}) => {
  const tree = await request.get("/api/trpc/category.tree");
  await expect(tree).toBeOK();
  const body = await tree.text();
  for (const id of [
    "000000000000000000000004",
    "000000000000000000000010",
    "000000000000000000000011",
  ])
    expect(body).toContain(id);
  await page.goto("/en/list/category/engineering");
  await expect(
    page.locator(`a[href="/en/archives/${postId}"]`).first(),
  ).toBeVisible();
});

test("@regression comment reply and cancel controls work from the keyboard", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        author: "Keyboard visitor",
        email: "keyboard@honeycomb.test",
      }),
    );
  });
  await page.goto(`/en/archives/${postId}`);
  // The saved identity appears after the comment component's mount effect;
  // this waits for hydration without arbitrary sleeps or internal React APIs.
  await expect(page.getByText(/Welcome back.*Keyboard visitor/)).toBeVisible();
  const reply = page
    .getByRole("button", { name: "Reply", exact: true })
    .first();
  await reply.focus();
  await expect(reply).toBeFocused();
  await reply.press("Enter");
  await expect(page.getByText("Reply to:", { exact: true })).toBeVisible();
  const cancel = page.getByRole("button", { name: /Cancel/i });
  await cancel.focus();
  await cancel.press("Space");
  await expect(page.getByText("Reply to:", { exact: true })).toHaveCount(0);
  const quit = page.getByRole("button", { name: /Quit/i });
  await quit.press("Enter");
  await expect(page.getByLabel(/Please enter email/)).toBeVisible();
});

test("@regression private requests stay out of Cache Storage and logout survives back navigation", async ({
  page,
}) => {
  // This exercises real captcha/session transport, worker activation and
  // multiple server navigations, unlike a single-page interaction test.
  test.setTimeout(60_000);
  await signInAsDashboardTestUser(page);
  await page.goto("/en/list/category");
  const workerUrl = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).active?.scriptURL,
  );
  expect(workerUrl).toBeTruthy();
  if (!workerUrl) throw new Error("Service worker did not activate");
  const worker = await page.request.get(workerUrl);
  await expect(worker).toBeOK();
  expect(await worker.text()).not.toMatch(
    /_next\/static\/chunks\/app\/admin\//,
  );
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await page.goto("/admin/dashboard");
  await expect(page.getByTestId("admin-sidebar")).toBeVisible();
  await page.evaluate(async () => {
    await fetch("/api/trpc/user.current", { cache: "no-store" });
    await fetch("/admin/dashboard?_rsc=hardening", {
      headers: { RSC: "1" },
      cache: "no-store",
    });
  });
  const privateEntries = await page.evaluate(async () => {
    const requests = (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await caches.open(name)).keys(),
        ),
      )
    ).flat();
    return requests
      .map((request) => new URL(request.url).pathname)
      .filter((path) => /^\/(api|admin)(\/|$)/.test(path));
  });
  expect(privateEntries).toEqual([]);
  await page
    .getByTestId("admin-sidebar")
    .getByText("guest", { exact: true })
    .click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goBack();
  await expect(page.getByTestId("admin-sidebar")).toHaveCount(0);
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByTestId("admin-sidebar")).toHaveCount(0);
  const privateRead = await page.request.get("/api/trpc/user.index", {
    params: { input: "{}" },
  });
  expect(privateRead.status()).toBe(401);
});

for (const [target, expected] of [
  ["https://evil.test/steal", "/admin/dashboard"],
  ["//evil.test/steal", "/admin/dashboard"],
  [
    "/admin/account/security?tab=sessions",
    "/admin/account/security?tab=sessions",
  ],
] as const) {
  test(`@regression login normalizes callback ${target}`, async ({ page }) => {
    // Only the external captcha and credential transport are fixtures; both
    // server/client normalization and browser navigation run unchanged.
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
    await page.route("**/api/auth/sign-in/username", (route) =>
      route.fulfill({
        json: { token: "fixture-token", user: { id: "fixture-user" } },
      }),
    );
    await page.route(`**${expected}`, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<main>Callback destination</main>",
      }),
    );
    await page.goto(`/admin/login?targetUrl=${encodeURIComponent(target)}`);
    await page.getByPlaceholder("用户名", { exact: true }).fill("guest");
    await page.getByPlaceholder("密码", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(
      (url) => url.pathname + url.search === expected,
    );
    await expect(
      page.getByText("Callback destination", { exact: true }),
    ).toBeVisible();
  });
}
