import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function resolveAssetOrigin(configuredAssetUrl: string) {
  return new URL(configuredAssetUrl).origin;
}

export function resolveR2UploadOrigin(configuredAccountId: string) {
  return new URL(`https://${configuredAccountId}.r2.cloudflarestorage.com`)
    .origin;
}

export function createR2PresignedUploadUrl({
  accountId,
  bucketName,
  key,
}: {
  accountId: string;
  bucketName: string;
  key: string;
}) {
  const client = new S3Client({
    region: "auto",
    endpoint: resolveR2UploadOrigin(accountId),
    forcePathStyle: true,
    credentials: {
      accessKeyId: "playwright-access-key",
      secretAccessKey: "playwright-secret-key",
    },
  });

  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: "text/plain",
    }),
    { expiresIn: 3600 },
  );
}
