import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

/**
 * S3 存储服务类。
 * 封装了与 S3 兼容存储（如 Cloudflare R2）进行交互的方法，包括文件上传和删除。
 */
class S3 {
  /**
   * 初始化 S3 客户端。
   * @returns {S3Client} S3 客户端实例。
   */
  static S3 = () => {
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
    await S3.S3().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        ContentType,
        Key,
        Body,
      }),
    );
    return `https://static.guanweisong.com/${Key}`;
  };

  /**
   * 删除 S3 存储桶中的多个文件。
   * @param {any} params - 删除参数，包括 Objects (要删除的文件键列表)。
   * @returns {Promise<any>} 删除操作的响应。
   */
  static deleteMultipleObject = (params: any) => {
    const { Objects } = params;
    return S3.S3().send(
      new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: { Objects },
      }),
    );
  };
}

export default S3;
