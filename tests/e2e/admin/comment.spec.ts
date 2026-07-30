import { expect, test } from "@playwright/test";

type CommentRecord = {
  id: string;
  content: string;
  postId: string;
  author: string;
  email: string;
  site: string | null;
  ip: string;
  status: "TO_AUDIT" | "PUBLISH" | "RUBBISH" | "BAN";
  createdAt: string;
  updatedAt: string;
};

test.describe("admin comment moderation", () => {
  test("@regression moderates and batch deletes comments through the browser contract", async ({
    page,
  }) => {
    const comments: CommentRecord[] = [
      {
        id: "comment-1",
        content: "需要审核的评论",
        postId: "post-1",
        author: "评论者",
        email: "commenter@example.com",
        site: null,
        ip: "127.0.0.1",
        status: "TO_AUDIT",
        createdAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      },
    ];
    const commentIndexInputs: unknown[] = [];
    const updateInputs: unknown[] = [];
    const destroyInputs: unknown[] = [];
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
      const procedureNames = new URL(request.url())
        .pathname.split("/")
        .at(-1)!
        .split(",");
      const rawInput =
        request.method() === "GET"
          ? new URL(request.url()).searchParams.get("input")
          : request.postData();
      const inputs = rawInput
        ? (JSON.parse(rawInput) as Record<string, unknown>)
        : {};
      const result = procedureNames.map((procedure, index) => {
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
        if (procedure === "setting.index") {
          return { result: { data: setting } };
        }
        if (procedure === "comment.index") {
          commentIndexInputs.push(input);
          return { result: { data: { list: comments, total: comments.length } } };
        }
        if (procedure === "comment.update") {
          updateInputs.push(input);
          const { id, status } = input as {
            id: string;
            status: CommentRecord["status"];
          };
          const comment = comments.find((item) => item.id === id);
          if (comment) comment.status = status;
          return { result: { data: comment } };
        }
        if (procedure === "comment.destroy") {
          destroyInputs.push(input);
          const ids = (input as { ids: string[] }).ids;
          for (const id of ids) {
            const indexToDelete = comments.findIndex((item) => item.id === id);
            if (indexToDelete >= 0) comments.splice(indexToDelete, 1);
          }
          return { result: { data: { success: true } } };
        }

        throw new Error(`Unhandled tRPC procedure: ${procedure}`);
      });

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });

    await page.goto("/admin/comment", { waitUntil: "networkidle" });
    await expect(page.getByText("需要审核的评论")).toBeVisible();
    const initialCommentIndexCallCount = commentIndexInputs.length;
    expect(initialCommentIndexCallCount).toBeGreaterThan(0);

    await page.getByRole("button", { name: "通过" }).click();
    await page.getByRole("button", { name: "确定" }).click();
    await expect.poll(() => updateInputs).toEqual([
      { id: "comment-1", status: "PUBLISH" },
    ]);
    await expect(page.getByText("更新成功")).toBeVisible();
    await expect
      .poll(() => commentIndexInputs.length)
      .toBe(initialCommentIndexCallCount + 1);
    await expect(page.getByText("已发布")).toBeVisible();
    await expect(page.getByRole("button", { name: "屏蔽" })).toBeVisible();
    await expect(page.getByRole("button", { name: "通过" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "驳回" })).toHaveCount(0);

    await page.getByRole("checkbox").last().click();
    const batchDelete = page.getByRole("button", { name: "批量删除" });
    await expect(batchDelete).toBeEnabled();
    await batchDelete.click();
    await page.getByRole("button", { name: "确定" }).click();
    await expect.poll(() => destroyInputs).toEqual([{ ids: ["comment-1"] }]);
    await expect(page.getByText("删除成功")).toBeVisible();
    await expect(page.getByText("需要审核的评论")).toHaveCount(0);
  });
});
