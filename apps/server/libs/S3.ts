import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

class S3 {
  /**
   * 实例初始化
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
   * 上传文件
   * @param params
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
   * 删除文件
   * @param params
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
