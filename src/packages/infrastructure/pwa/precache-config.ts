/** Build-relative assets that are deliberately excluded from offline install. */
export const pwaGlobIgnores = [
  "**/*.map",
  "public/static/images/desktop.png",
  "public/static/images/mobile.png",
  ".next/server/app/admin/**/*",
  ".next/static/app/admin/**/*",
] as const;

export const offlinePrecacheUrl = "/en/offline";
