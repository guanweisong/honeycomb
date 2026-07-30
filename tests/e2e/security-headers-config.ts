export function resolveAssetOrigin(configuredAssetUrl: string) {
  return new URL(configuredAssetUrl).origin;
}

export function resolveR2UploadOrigin(configuredAccountId: string) {
  return new URL(`https://${configuredAccountId}.r2.cloudflarestorage.com`)
    .origin;
}
