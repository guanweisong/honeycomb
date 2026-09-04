import "server-only";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  type PutObjectCommandInput,
  type DeleteObjectsCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { clientEnv } from "@/env/client";
import { getR2Env } from "@/env/server";
import { observeExternalServiceOperation } from "@/packages/infrastructure/observability/server";

interface DeleteMultipleObjectParams {
  Objects: NonNullable<DeleteObjectsCommandInput["Delete"]>["Objects"];
}

class S3 {
  static getPublicAssetUrl = (key: string) => {
    return `${clientEnv.NEXT_PUBLIC_ASSET_URL}/${key}`;
  };

  /**
   * 实例初始化
   */
  static S3 = () => {
    const r2 = getR2Env();
    if (!r2) throw new Error("R2 integration is not configured");

    return new S3Client({
      region: "auto",
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
    });
  };

  /**
   * 上传文件
   * @param params
   */
  static putObject = async (params: PutObjectCommandInput): Promise<string> => {
    const { Key, Body, ContentType } = params;
    if (!Key) throw new Error("Object storage key is required");
    const r2 = getR2Env();
    if (!r2) throw new Error("R2 integration is not configured");
    await observeExternalServiceOperation("object-storage", "put", () =>
      S3.S3().send(
        new PutObjectCommand({
          Bucket: r2.bucketName,
          ContentType,
          Key,
          Body,
        }),
      ),
    );
    return S3.getPublicAssetUrl(Key);
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
    const r2 = getR2Env();
    if (!r2) throw new Error("R2 integration is not configured");
    const command = new PutObjectCommand({
      Bucket: r2.bucketName,
      Key,
      ContentType,
    });
    return observeExternalServiceOperation("object-storage", "presign", () =>
      getSignedUrl(S3.S3(), command, { expiresIn: 3600 }),
    );
  };

  /**
   * 删除文件
   * @param params
   */
  static deleteMultipleObject = (params: DeleteMultipleObjectParams) => {
    const { Objects } = params;
    const r2 = getR2Env();
    if (!r2) throw new Error("R2 integration is not configured");
    return observeExternalServiceOperation(
      "object-storage",
      "delete",
      async () => {
        const result = await S3.S3().send(
          new DeleteObjectsCommand({
            Bucket: r2.bucketName,
            Delete: { Objects },
          }),
        );
        if (result.Errors?.length) {
          throw new Error("Object storage delete failed");
        }
        return result;
      },
    );
  };

  /** 删除一组对象。S3/R2 对不存在的 key 也按成功处理，因此可安全重试。 */
  static deleteObjects = async (keys: readonly string[]): Promise<void> => {
    if (keys.length === 0) return;
    await S3.deleteMultipleObject({ Objects: keys.map((Key) => ({ Key })) });
  };
}

export default S3;
