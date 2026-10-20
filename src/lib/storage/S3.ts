import "server-only";

import {
  S3Client,
  CopyObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
  type PutObjectCommandInput,
  type DeleteObjectsCommandInput,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { clientEnv } from "@/env/client";
import { getR2Env } from "@/env/server";
import { observeExternalServiceOperation } from "@/lib/observability/server";

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
  static S3 = (maxAttempts = 3) => {
    const r2 = getR2Env();
    if (!r2) throw new Error("R2 integration is not configured");

    return new S3Client({
      region: "auto",
      maxAttempts,
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
    ContentLength?: number;
  }): Promise<string> => {
    const { Key, ContentType, ContentLength } = params;
    const r2 = getR2Env();
    if (!r2) throw new Error("R2 integration is not configured");
    const command = new PutObjectCommand({
      Bucket: r2.bucketName,
      Key,
      ContentType,
      ContentLength,
    });
    return observeExternalServiceOperation("object-storage", "presign", () =>
      getSignedUrl(S3.S3(), command, {
        expiresIn: 3600,
        signableHeaders: new Set(["content-type"]),
      }),
    );
  };

  /** A candidate is written once. Retrying COPY could replace already validated bytes. */
  static copyCandidate = async (
    source: string,
    candidate: string,
    type: string,
  ) => {
    const r2 = getR2Env();
    if (!r2) throw new Error("R2 integration is not configured");
    await S3.S3(1).send(
      new CopyObjectCommand({
        Bucket: r2.bucketName,
        Key: candidate,
        CopySource: `${r2.bucketName}/${source.split("/").map(encodeURIComponent).join("/")}`,
        MetadataDirective: "REPLACE",
        ContentType: type,
      }),
    );
  };

  static headObject = async (key: string) => {
    const r2 = getR2Env();
    if (!r2) throw new Error("R2 integration is not configured");
    try {
      const result = await S3.S3().send(
        new HeadObjectCommand({ Bucket: r2.bucketName, Key: key }),
      );
      return { size: result.ContentLength, type: result.ContentType };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "$metadata" in error &&
        error.$metadata &&
        typeof error.$metadata === "object" &&
        "httpStatusCode" in error.$metadata &&
        error.$metadata.httpStatusCode === 404
      )
        return null;
      throw error;
    }
  };

  /** Read from authenticated storage with a hard streaming byte limit, never the CDN. */
  static readObject = async (
    key: string,
    maxBytes: number,
  ): Promise<Uint8Array> => {
    const r2 = getR2Env();
    if (!r2) throw new Error("R2 integration is not configured");
    const result = await S3.S3().send(
      new GetObjectCommand({ Bucket: r2.bucketName, Key: key }),
    );
    if (!(result.Body instanceof Readable))
      throw new Error("Unsupported object stream");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for await (const chunk of result.Body) {
        if (!(chunk instanceof Uint8Array))
          throw new Error("Invalid object stream");
        size += chunk.byteLength;
        if (size > maxBytes) throw new Error("Object exceeds byte limit");
        chunks.push(chunk);
      }
      return Buffer.concat(chunks, size);
    } finally {
      result.Body.destroy();
    }
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
