import { expect, test } from "@playwright/test";

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
  test("@regression uploads and removes media through the browser contract", async ({
    page,
  }) => {
    const file = {
      name: "media-upload-contract.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("media upload regression"),
    };
    const media: MediaRecord[] = [];
    const presignedInputs: unknown[] = [];
    const uploadInputs: unknown[] = [];
    const destroyInputs: unknown[] = [];
    const storageRequests: { body: Buffer | null; contentType: string | null }[] = [];

    await page.route("https://upload.honeycomb.test/**", async (route) => {
      const request = route.request();
      storageRequests.push({
        body: request.postDataBuffer(),
        contentType: await request.headerValue("content-type"),
      });
      await route.fulfill({ status: 200 });
    });

    await page.route("**/api/trpc/**", async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const procedures = pathname.split("/").at(-1)!.split(",");
      const rawInput =
        request.method() === "GET"
          ? new URL(request.url()).searchParams.get("input")
          : request.postData();
      const inputs = rawInput ? (JSON.parse(rawInput) as Record<string, unknown>) : {};
      const result = procedures.map((procedure, index) => {
        const input = (inputs[String(index)] as { json?: unknown } | undefined)
          ?.json;

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
        if (procedure === "media.getPresignedUrl") {
          presignedInputs.push(input);
          return {
            result: {
              data: {
                key: "media/media-upload-contract.txt",
                url: "https://upload.honeycomb.test/media-upload-contract.txt",
              },
            },
          };
        }
        if (procedure === "media.upload") {
          uploadInputs.push(input);
          const record = {
            ...(input as Omit<MediaRecord, "id" | "url">),
            id: "media-upload-contract",
            url: "https://assets.honeycomb.test/media/media-upload-contract.txt",
          } satisfies MediaRecord;
          media.push(record);
          return { result: { data: record } };
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
    const uploadButton = page.getByRole("button", { name: "点击上传文件" });
    await expect(uploadButton).toBeVisible();
    const fileChooserPromise = page.waitForEvent("filechooser");
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);

    await expect(page.getByText("成功上传 1 个文件")).toBeVisible();
    expect(presignedInputs).toEqual([
      { name: file.name, type: file.mimeType },
    ]);
    expect(uploadInputs).toEqual([
      {
        name: file.name,
        type: file.mimeType,
        size: file.buffer.length,
        key: "media/media-upload-contract.txt",
        width: null,
        height: null,
        color: null,
      },
    ]);
    expect(storageRequests).toEqual([
      { body: file.buffer, contentType: file.mimeType },
    ]);

    const tile = page.getByTitle(file.name);
    await expect(tile).toBeVisible();
    const deleteButton = tile.getByRole("button").last();
    await deleteButton.click();
    await page.getByRole("button", { name: "确定" }).click();
    await expect(tile).toHaveCount(0);
    expect(destroyInputs).toEqual([{ ids: ["media-upload-contract"] }]);
  });
});
