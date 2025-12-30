import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * S3 存储服务类。
 * 封装了与 S3 兼容存储（如 Cloudflare R2）进行交互的方法，包括文件上传和删除。
 */
class S3 {
  static getR2BucketOrNull = async () => {
    try {
      const { env } = await getCloudflareContext({ async: true });
      const bucket = (env as any).MEDIA_R2_BUCKET as any;
      return bucket ?? null;
    } catch {
      return null;
    }
  };

  static importAwsS3 = async () => {
    // Intentionally not using a string-literal `import()` so that bundlers don't
    // include AWS SDK in the Worker bundle.
    const importer = new Function("m", "return import(m)") as (
      module: string,
    ) => Promise<any>;
    return importer("@aws-sdk/client-s3");
  };

  static getAwsS3Client = async () => {
    const { S3Client } = await S3.importAwsS3();
    return new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  };

  /**
   * 上传文件到 S3 存储桶。
   * @param {any} params - 上传参数，包括 Key (文件名), Body (文件内容), ContentType (文件类型)。
   * @returns {Promise<string>} 上传成功后的文件 URL。
   */
  static putObject = async (params: any): Promise<string> => {
    const { Key, Body, ContentType } = params;
    const r2Bucket = await S3.getR2BucketOrNull();
    if (r2Bucket) {
      await r2Bucket.put(Key, Body, {
        httpMetadata: {
          contentType: ContentType,
        },
      });
    } else {
      const { PutObjectCommand } = await S3.importAwsS3();
      const client = await S3.getAwsS3Client();
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          ContentType,
          Key,
          Body,
        }),
      );
    }
    return `https://static.guanweisong.com/${Key}`;
  };

  /**
   * 删除 S3 存储桶中的多个文件。
   * @param {any} params - 删除参数，包括 Objects (要删除的文件键列表)。
   * @returns {Promise<any>} 删除操作的响应。
   */
  static deleteMultipleObject = (params: any) => {
    const { Objects } = params;
    return (async () => {
      const keys = (Objects ?? []).map((o: any) => o?.Key).filter(Boolean);
      const r2Bucket = await S3.getR2BucketOrNull();
      if (r2Bucket) {
        await Promise.all(keys.map((key: string) => r2Bucket.delete(key)));
        return { Deleted: keys.map((Key: string) => ({ Key })) };
      }

      const { DeleteObjectsCommand } = await S3.importAwsS3();
      const client = await S3.getAwsS3Client();
      return client.send(
        new DeleteObjectsCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Delete: { Objects },
        }),
      );
    })();
  };
}

export default S3;
