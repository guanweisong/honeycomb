import { expect, test } from "@playwright/test";

const storageState = process.env.MEDIA_UPLOAD_E2E_STORAGE_STATE;
const canRunUploadContract =
  process.env.MEDIA_UPLOAD_E2E === "1" && storageState !== undefined;

test.describe("admin media upload", () => {
  test.skip(
    !canRunUploadContract,
    "requires an authenticated MEDIA_UPLOAD_E2E_STORAGE_STATE and real object storage",
  );
  test.use({ storageState });

  test("@regression uploads a file through the presigned PUT contract", async ({
    page,
  }) => {
    const file = {
      name: "media-upload-contract.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("media upload regression"),
    };
    const presignedUrlRequest = page.waitForRequest((request) =>
      request.url().includes("media.getPresignedUrl"),
    );
    const storagePutRequest = page.waitForRequest(
      (request) => request.method() === "PUT",
    );

    await page.goto("/admin/media", { waitUntil: "networkidle" });
    const input = page.locator('input[type="file"]');
    await expect(input).toBeVisible();
    await input.setInputFiles(file);

    const [presignedRequest, putRequest] = await Promise.all([
      presignedUrlRequest,
      storagePutRequest,
    ]);
    await expect(page.getByText("成功上传 1 个文件")).toBeVisible();

    expect(presignedRequest.postData()).toContain(file.name);
    expect(presignedRequest.postData()).toContain(file.mimeType);
    expect(putRequest.headerValue("content-type")).toBe(file.mimeType);
    expect(putRequest.postDataBuffer()).toEqual(file.buffer);
  });
});
