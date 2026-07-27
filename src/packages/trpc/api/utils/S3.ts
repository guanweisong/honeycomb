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
import { observeExternalServiceOperation } from "@/packages/observability/server";

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
      )
    );
    return S3.getPublicAssetUrl(Key as string);
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
    return observeExternalServiceOperation(
      "object-storage",
      "presign",
      () => getSignedUrl(S3.S3(), command, { expiresIn: 3600 }),
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
    return observeExternalServiceOperation("object-storage", "delete", async () => {
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
    });
  };
}

export default S3;
