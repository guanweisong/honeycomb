import { expect, test } from "@playwright/test";

const postId = "000000000000000000000005";

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
