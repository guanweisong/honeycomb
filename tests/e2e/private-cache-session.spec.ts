import { expect, test } from "@playwright/test";
import { signInAsDashboardTestUser } from "@tests/e2e/admin/auth";

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
  const privateResponses = await page.evaluate(async () => {
    const api = await fetch("/api/trpc/user.current", { cache: "no-store" });
    // RSC requests with no router state or prefetch headers use an empty hash.
    const rsc = await fetch("/admin/dashboard?_rsc", {
      headers: { RSC: "1" },
      cache: "no-store",
    });
    return {
      apiStatus: api.status,
      rscStatus: rsc.status,
      rscType: rsc.headers.get("content-type"),
    };
  });
  expect(privateResponses.apiStatus).toBe(200);
  expect(privateResponses.rscStatus).toBe(200);
  expect(privateResponses.rscType).toContain("text/x-component");
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
