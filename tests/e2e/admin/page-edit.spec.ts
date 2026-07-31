import { expect, test } from "@playwright/test";

type PageRecord = {
  id: string;
  title: { en: string; zh: string };
  content: { en: string; zh: string };
  status: "DRAFT" | "PUBLISHED";
  template: "default" | "friendly-links";
};

test.describe("admin page editor", () => {
  test("@regression creates then edits pages through the browser contract", async ({
    page,
  }) => {
    const records = new Map<string, PageRecord>();
    const createInputs: unknown[] = [];
    const detailInputs: unknown[] = [];
    const updateInputs: unknown[] = [];
    const setting = {
      id: "setting-1",
      siteName: { en: "Honeycomb", zh: "蜂巢" },
      siteSubName: { en: "Site", zh: "站点" },
      siteSignature: { en: "Signature", zh: "签名" },
      siteCopyright: { en: "Copyright", zh: "版权" },
      siteRecordNo: null,
      siteRecordUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await page.route("**/api/trpc/**", async (route) => {
      const request = route.request();
      const procedures = new URL(request.url()).pathname
        .split("/")
        .at(-1)!
        .split(",");
      const rawInput =
        request.method() === "GET"
          ? new URL(request.url()).searchParams.get("input")
          : request.postData();
      const inputs = rawInput
        ? (JSON.parse(rawInput) as Record<string, unknown>)
        : {};
      const result = procedures.map((procedure, index) => {
        const requestInput = inputs[String(index)];
        const input =
          requestInput &&
          typeof requestInput === "object" &&
          "json" in requestInput
            ? (requestInput as { json?: unknown }).json
            : requestInput;
        if (procedure === "user.current") {
          return {
            result: {
              data: {
                id: "admin-1",
                name: "admin",
                email: "admin@honeycomb.test",
                level: "ADMIN",
                status: "ENABLE",
              },
            },
          };
        }
        if (procedure === "setting.index") return { result: { data: setting } };
        if (procedure === "page.create") {
          createInputs.push(input);
          const record = {
            ...(input as Omit<PageRecord, "id">),
            id: "page-created",
          } satisfies PageRecord;
          records.set(record.id, record);
          return { result: { data: record } };
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
          const values = input as PageRecord;
          const record = { ...records.get(values.id), ...values } as PageRecord;
          records.set(record.id, record);
          return { result: { data: record } };
        }
        throw new Error(`Unhandled tRPC procedure: ${procedure}`);
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });

    await page.goto("/admin/page/edit", { waitUntil: "networkidle" });
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

    await expect(page).toHaveURL(/\/admin\/page\/edit\?id=page-created$/);
    await expect(page.getByText("添加成功")).toBeVisible();
    expect(createInputs).toEqual([
      {
        title: { en: "About us", zh: "关于我们" },
        content: { en: "<p>English content</p>", zh: "<p>中文内容</p>" },
        template: "default",
        status: "DRAFT",
      },
    ]);

    await expect.poll(() => detailInputs).toEqual([{ id: "page-created" }]);
    await page.getByRole("tab", { name: "zh" }).first().click();
    await page.getByPlaceholder("在此输入页面标题").fill("更新后的页面");
    await page.getByRole("button", { name: "发布" }).click();

    await expect(page.getByText("更新成功")).toBeVisible();
    await expect
      .poll(() => updateInputs)
      .toEqual([
        {
          id: "page-created",
          title: { en: "About us", zh: "更新后的页面" },
          content: { en: "<p>English content</p>", zh: "<p>中文内容</p>" },
          template: "default",
          status: "PUBLISHED",
        },
      ]);
    await expect
      .poll(() => detailInputs)
      .toEqual([{ id: "page-created" }, { id: "page-created" }]);
  });
});
