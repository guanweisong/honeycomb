import { expect, test } from "@playwright/test";
import { refreshMockedAdminUser, signInAsDashboardTestUser } from "./auth";

test.use({ bypassCSP: true });

type MediaRecord = {
  id: string;
  key: string;
  name: string;
  type: string;
  size: number;
  url: string;
  width: number | null;
  height: number | null;
  color: string | null;
};

test.describe("admin media upload", () => {
  for (const scenario of ["success", "partial", "cleanup-rejected"] as const) {
    test(`@regression ${scenario}: uploads, cleans and removes media through the browser contract`, async ({
      page,
    }) => {
      const file = {
        name: "media-upload-contract.png",
        mimeType: "image/png",
        buffer: Buffer.from("media upload regression"),
      };
      const rejectedFile = { ...file, name: "rejected.png" };
      const media: MediaRecord[] = [];
      const cleanupRequests: string[] = [];
      const presignedInputs: unknown[] = [];
      const uploadInputs: unknown[] = [];
      const destroyInputs: unknown[] = [];
      const storageRequests: {
        body: Buffer | null;
        contentType: string | null;
      }[] = [];
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
            status: scenario === "cleanup-rejected" ? 403 : 204,
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
        const pathname = new URL(request.url()).pathname;
        const procedures = pathname.split("/").at(-1)!.split(",");
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
          if (procedure === "media.index") {
            return { result: { data: { list: media, total: media.length } } };
          }
          if (procedure === "setting.index") {
            return { result: { data: setting } };
          }
          if (procedure === "media.getPresignedUrl") {
            presignedInputs.push(input);
            const name =
              typeof input === "object" &&
              input !== null &&
              "name" in input &&
              typeof input.name === "string"
                ? input.name
                : "";
            return {
              result: {
                data: {
                  key: `media/${name}`,
                  url: `https://upload.honeycomb.test/${name}`,
                  cleanupUrl: `https://upload.honeycomb.test/cleanup/${name}`,
                },
              },
            };
          }
          if (procedure === "media.upload") {
            uploadInputs.push(input);
            if (
              typeof input === "object" &&
              input !== null &&
              "name" in input &&
              input.name === rejectedFile.name
            )
              return {
                result: {
                  data: { state: "rejected", message: "媒体信息未保存" },
                },
              };
            const record = {
              ...(input as Omit<MediaRecord, "id" | "url">),
              id: "media-upload-contract",
              url: "https://assets.honeycomb.test/media/media-upload-contract.png",
            } satisfies MediaRecord;
            media.push(record);
            return { result: { data: { state: "created", media: record } } };
          }
          if (procedure === "media.destroy") {
            destroyInputs.push(input);
            const ids = (input as { ids: string[] }).ids;
            for (const id of ids) {
              const indexToDelete = media.findIndex((item) => item.id === id);
              if (indexToDelete >= 0) media.splice(indexToDelete, 1);
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

      await page.goto("/admin/media", { waitUntil: "networkidle" });
      await refreshMockedAdminUser(page);
      const uploadButton = page.getByRole("button", { name: "点击上传文件" });
      await expect(uploadButton).toBeVisible();
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
          { name: file.name, type: file.mimeType, size: file.buffer.length },
        ]),
      );
      await expect.poll(() => uploadInputs.length).toBe(expectedCount);
      expect(uploadInputs).toEqual(
        expect.arrayContaining([
          {
            name: file.name,
            type: file.mimeType,
            size: file.buffer.length,
            key: "media/media-upload-contract.png",
            width: null,
            height: null,
            color: null,
          },
        ]),
      );
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
          page.getByText(/成功上传 1 个文件，1 个失败，0 个待确认/),
        ).toBeVisible();
        expect(cleanupRequests).toEqual(["/cleanup/rejected.png"]);
        if (scenario === "cleanup-rejected")
          await expect(page.getByText(/存储清理失败/)).toBeVisible();
        expect(media.map((item) => item.name)).toEqual([file.name]);
      }

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
      await page.getByRole("button", { name: "确定" }).click();
      await expect(tile).toHaveCount(0);
      expect(destroyInputs).toEqual([{ ids: ["media-upload-contract"] }]);
    });
  }
});
