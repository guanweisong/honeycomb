import { expect, test } from "@playwright/test";
import {
  refreshMockedAdminUser,
  signInAsDashboardTestUser,
} from "./auth";
import type { PageViewModel } from "@/features/contracts";
import type {
  PageInsert,
  PageUpdate,
} from "@/features/page/application/write-schema";
import { decodeTrpcBatchRequest } from "@tests/helpers/trpc-batch";
import { mockedAdminUser, mockedSiteSetting } from "./fixtures";
import { PageStatus } from "@/packages/domain/content/page";

const PAGE_ID = "0123456789abcdef01234567";

test.describe("admin page editor", () => {
  test("@regression creates then edits pages through the browser contract", async ({
    page,
  }) => {
    const records = new Map<string, PageViewModel>();
    const createInputs: unknown[] = [];
    const detailInputs: unknown[] = [];
    const updateInputs: unknown[] = [];
    await signInAsDashboardTestUser(page);

    await page.route("**/api/trpc/**", async (route) => {
      const request = route.request();
      const calls = decodeTrpcBatchRequest({
        url: request.url(),
        method: request.method(),
        body: request.postData(),
      });
      const result = calls.map(({ procedure, input }) => {
        if (procedure === "user.current") {
          return {
            result: {
              data: mockedAdminUser,
            },
          };
        }
        if (procedure === "setting.index")
          return { result: { data: mockedSiteSetting } };
        if (procedure === "page.create") {
          createInputs.push(input);
          const values = input as PageInsert;
          const record = {
            ...values,
            id: PAGE_ID,
            status: values.status ?? PageStatus.DRAFT,
            authorId: mockedAdminUser.id,
            views: 0,
            createdAt: "2026-01-02T03:04:05.000Z",
            updatedAt: "2026-01-02T03:04:05.000Z",
            author: { id: mockedAdminUser.id, name: mockedAdminUser.name },
            imagesInContent: [],
          } satisfies PageViewModel;
          records.set(record.id, record);
          return { result: { data: { id: record.id } } };
        }
        if (procedure === "page.adminDetail") {
          if (!input) return { result: { data: null } };
          detailInputs.push(input);
          return {
            result: { data: records.get((input as { id: string }).id) ?? null },
          };
        }
        if (procedure === "page.update") {
          updateInputs.push(input);
          const values = input as PageUpdate;
          const current = records.get(values.id);
          if (!current) throw new Error(`Unknown page: ${values.id}`);
          const record = {
            ...current,
            ...values,
            updatedAt: "2026-01-03T03:04:05.000Z",
          } satisfies PageViewModel;
          records.set(record.id, record);
          return { result: { data: { id: record.id } } };
        }
        throw new Error(`Unhandled tRPC procedure: ${procedure}`);
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });

    await page.goto("/admin/page/edit", { waitUntil: "networkidle" });
    await refreshMockedAdminUser(page);
    await page.getByPlaceholder("在此输入页面标题").fill("关于我们");
    await page.getByRole("tab", { name: "en" }).first().click();
    await page.getByPlaceholder("在此输入页面标题").fill("About us");
    await page.getByRole("tab", { name: "zh" }).nth(1).click();
    await page.locator(".prose-editor [contenteditable=true]").fill("中文内容");
    await page.getByRole("tab", { name: "en" }).nth(1).click();
    await page
      .locator(".prose-editor [contenteditable=true]")
      .fill("English content");
    await page.getByRole("button", { name: "保存草稿" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/admin/page/edit\\?id=${PAGE_ID}$`),
    );
    await expect(page.getByText("添加成功")).toBeVisible();
    expect(createInputs).toEqual([
      {
        title: { en: "About us", zh: "关于我们" },
        content: { en: "<p>English content</p>", zh: "<p>中文内容</p>" },
        template: "default",
        status: "DRAFT",
      },
    ]);

    await expect.poll(() => detailInputs).toEqual([{ id: PAGE_ID }]);
    await expect(page.getByPlaceholder("在此输入页面标题")).toHaveValue(
      "About us",
    );
    await page.getByRole("tab", { name: "zh" }).first().click();
    await page.getByPlaceholder("在此输入页面标题").fill("更新后的页面");
    await page.getByRole("button", { name: "发布" }).click();

    await expect
      .poll(() => updateInputs)
      .toEqual([
        {
          id: PAGE_ID,
          title: { en: "About us", zh: "更新后的页面" },
          content: { en: "<p>English content</p>", zh: "<p>中文内容</p>" },
          template: "default",
          status: "PUBLISHED",
        },
      ]);
    await expect(page.getByText("更新成功")).toBeVisible();
    await expect
      .poll(() => detailInputs)
      .toEqual([{ id: PAGE_ID }, { id: PAGE_ID }]);
  });
});
