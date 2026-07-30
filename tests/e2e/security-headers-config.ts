export function resolveAssetOrigin(configuredAssetUrl: string) {
  return new URL(configuredAssetUrl).origin;
}
