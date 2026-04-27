import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  type PutObjectCommandInput,
  type DeleteObjectsCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface DeleteMultipleObjectParams {
  Objects: NonNullable<DeleteObjectsCommandInput["Delete"]>["Objects"];
}

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
  static putObject = async (params: PutObjectCommandInput): Promise<string> => {
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
   * 生成预签名上传 URL
   * @param params
   */
  static getPresignedUrl = async (params: {
    Key: string;
    ContentType: string;
  }): Promise<string> => {
    const { Key, ContentType } = params;
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key,
      ContentType,
    });
    return getSignedUrl(S3.S3(), command, { expiresIn: 3600 });
  };

  /**
   * 删除文件
   * @param params
   */
  static deleteMultipleObject = (params: DeleteMultipleObjectParams) => {
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
