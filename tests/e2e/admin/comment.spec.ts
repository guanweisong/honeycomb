import { expect, test } from "@playwright/test";
import {
  refreshMockedAdminUser,
  signInAsDashboardTestUser,
} from "./auth";
import type { AdminCommentViewModel } from "@/features/contracts";
import { decodeTrpcBatchRequest } from "@tests/helpers/trpc-batch";
import { mockedAdminUser, mockedSiteSetting } from "./fixtures";
import { CommentStatus } from "@/packages/domain/content/comment";

test.describe("admin comment moderation", () => {
  test("@regression moderates and batch deletes comments through the browser contract", async ({
    page,
  }) => {
    const comments: AdminCommentViewModel[] = [
      {
        id: "comment-1",
        content: "需要审核的评论",
        postId: "post-1",
        pageId: null,
        customId: null,
        parentId: null,
        author: "评论者",
        email: "commenter@example.com",
        site: null,
        ip: "127.0.0.1",
        status: CommentStatus.TO_AUDIT,
        createdAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
        userAgent: null,
        post: { id: "post-1", title: { en: "Post", zh: "文章" } },
        page: null,
        custom: null,
      },
    ];
    const commentIndexInputs: unknown[] = [];
    const updateInputs: unknown[] = [];
    const destroyInputs: unknown[] = [];
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
        if (procedure === "setting.index") {
          return { result: { data: mockedSiteSetting } };
        }
        if (procedure === "comment.index") {
          commentIndexInputs.push(input);
          return { result: { data: { list: comments, total: comments.length } } };
        }
        if (procedure === "comment.update") {
          updateInputs.push(input);
          const { id, status } = input as {
            id: string;
            status: NonNullable<AdminCommentViewModel["status"]>;
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
    await refreshMockedAdminUser(page);
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
