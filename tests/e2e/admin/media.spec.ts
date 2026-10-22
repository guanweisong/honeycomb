import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { refreshMockedAdminUser, signInAsDashboardTestUser } from "./auth";
import type { MediaRecord as MediaViewModel } from "@/features/media/types/media.record";
import { MediaUploadIntentInputSchema } from "@/features/media/schema/media.upload.schema";
import { type MediaUploadIntentInput } from "@/features/media/types/media.upload";
import { MediaRegisterUploadSchema } from "@/features/media/schema/media.upload.schema";
import { MediaDeleteSchema } from "@/features/media/schema/media.delete.schema";
import { decodeTrpcBatchRequest } from "@tests/helpers/trpc-batch";
import { mockedAdminUser, mockedSiteSetting } from "./fixtures";

test.use({ bypassCSP: true });

test.describe("admin media upload", () => {
  for (const scenario of ["success", "partial", "lost-response"] as const) {
    test(`@regression ${scenario}: uploads, preserves uncertain objects and removes registered media through the browser contract`, async ({
      page,
    }) => {
      const file = {
        name: "media-upload-contract.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=",
          "base64",
        ),
      };
      const rejectedFile = { ...file, name: "rejected.png" };
      const media: MediaViewModel[] = [];
      const cleanupRequests: string[] = [];
      const presignedInputs: unknown[] = [];
      const uploadInputs: unknown[] = [];
      const operations = new Map<string, MediaUploadIntentInput>();
      const destroyInputs: unknown[] = [];
      const storageRequests: {
        body: Buffer | null;
        contentType: string | null;
      }[] = [];
      await signInAsDashboardTestUser(page);

      await page.route("https://upload.honeycomb.test/**", async (route) => {
        const request = route.request();
        if (request.method() === "OPTIONS") {
          await route.fulfill({
            status: 204,
            headers: {
              "access-control-allow-origin": "*",
              "access-control-allow-methods": "PUT, DELETE",
              "access-control-allow-headers": "content-type",
            },
          });
          return;
        }
        if (request.method() === "DELETE") {
          cleanupRequests.push(new URL(request.url()).pathname);
          await route.fulfill({
            status: 403,
            headers: { "access-control-allow-origin": "*" },
          });
          return;
        }
        if (request.method() !== "PUT") return route.fallback();

        storageRequests.push({
          body: request.postDataBuffer(),
          contentType: await request.headerValue("content-type"),
        });
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
        });
      });

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
                data: {
                  ...mockedAdminUser,
                },
              },
            };
          }
          if (procedure === "media.index") {
            return {
              result: {
                data: {
                  list: media,
                  total: media.length,
                },
              },
            };
          }
          if (procedure === "setting.index") {
            return { result: { data: mockedSiteSetting } };
          }
          if (procedure === "media.prepareUpload") {
            presignedInputs.push(input);
            const values = MediaUploadIntentInputSchema.parse(input);
            const id =
              values.name === file.name
                ? "507f1f77bcf86cd799439011"
                : "507f1f77bcf86cd799439012";
            operations.set(id, values);
            return {
              result: {
                data: {
                  intent: id,
                  uploadUrl: `https://upload.honeycomb.test/${values.name}`,
                  expiresAt: "2026-10-20T12:00:00.000Z",
                },
              },
            };
          }
          if (procedure === "media.registerUpload") {
            uploadInputs.push(input);
            const { intent: id } = MediaRegisterUploadSchema.parse(input);
            const values = operations.get(id);
            if (!values) throw new Error(`Unknown upload: ${id}`);
            if (values.name === rejectedFile.name)
              return {
                error: {
                  message:
                    scenario === "lost-response"
                      ? "保存结果未知，请人工核对"
                      : "图片内容未通过验证",
                  code: -32603,
                  data: {
                    code: "INTERNAL_SERVER_ERROR",
                    httpStatus: 500,
                    path: procedure,
                  },
                },
              };
            const record = {
              name: values.name,
              type: values.type,
              size: values.size,
              id,
              key: `media/${values.name}`,
              url: `https://assets.honeycomb.test/media/${values.name}`,
              color: null,
              height: 1,
              width: 1,
              createdAt: "2026-01-02T03:04:05.000Z",
              updatedAt: "2026-01-02T03:04:05.000Z",
            } satisfies MediaViewModel;
            media.push(record);
            return { result: { data: record } };
          }
          if (procedure === "media.destroy") {
            destroyInputs.push(input);
            const { ids } = MediaDeleteSchema.parse(input);
            for (const id of ids) {
              const indexToDelete = media.findIndex((item) => item.id === id);
              if (indexToDelete >= 0) media.splice(indexToDelete, 1);
            }
            return {
              result: { data: { success: true, publicSync: "completed" } },
            };
          }

          throw new Error(`Unhandled tRPC procedure: ${procedure}`);
        });

        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(result),
        });
      });

      await page.goto("/admin/media", { waitUntil: "networkidle" });
      await refreshMockedAdminUser(page);
      const uploadButton = page.getByRole("button", { name: "点击上传文件" });
      await expect(uploadButton).toBeVisible();
      await expect(page.getByText("暂无媒体", { exact: true })).toBeVisible();
      const fileChooserPromise = page.waitForEvent("filechooser");
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(
        scenario === "success" ? file : [file, rejectedFile],
      );

      const expectedCount = scenario === "success" ? 1 : 2;
      await expect.poll(() => presignedInputs.length).toBe(expectedCount);
      expect(presignedInputs).toEqual(
        expect.arrayContaining([
          {
            name: file.name,
            type: file.mimeType,
            size: file.buffer.length,
            sha256: createHash("sha256").update(file.buffer).digest("hex"),
          },
        ]),
      );
      await expect.poll(() => uploadInputs.length).toBe(expectedCount);
      expect(uploadInputs).toEqual(
        expect.arrayContaining([{ intent: "507f1f77bcf86cd799439011" }]),
      );
      for (const input of uploadInputs)
        expect(input).toEqual({ intent: expect.any(String) });
      expect(storageRequests).toHaveLength(expectedCount);
      for (const request of storageRequests)
        expect(request).toEqual({
          body: file.buffer,
          contentType: file.mimeType,
        });
      if (scenario === "success") {
        await expect(
          page.getByText("成功上传 1 个文件", { exact: true }),
        ).toBeVisible();
        expect(cleanupRequests).toEqual([]);
      } else {
        await expect(
          page.getByText(/成功上传 1 个文件，1 个失败/),
        ).toBeVisible();
        expect(media.map((item) => item.name)).toEqual([file.name]);
      }
      // Neither validation rejection nor ambiguous registration permits browser cleanup.
      expect(cleanupRequests).toEqual([]);

      const tile = page.getByTitle(file.name);
      await expect(tile).toBeVisible();
      await tile.focus();
      await expect(tile).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(tile).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: `复制 ${file.name} 的链接` }),
      ).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: `删除 ${file.name}` }),
      ).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toContainText(
        "删除可能导致这些引用失效",
      );
      await page.getByRole("button", { name: "确定" }).click();
      await expect(tile).toHaveCount(0);
      expect(destroyInputs).toEqual([
        {
          ids: ["507f1f77bcf86cd799439011"],
          acknowledgeUnknownReferences: true,
        },
      ]);
    });
  }
});
