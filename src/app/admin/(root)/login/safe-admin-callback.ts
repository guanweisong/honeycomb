const defaultAdminCallback = "/admin/dashboard";
const adminPathPattern = /^\/admin(?:\/|$)/;
const unsafePathCharacterPattern = /[%\\\u0000-\u001F\u007F]/;

/**
 * 保证登录完成后只会跳转到同源后台路径，避免开放重定向和路径混淆。
 */
export function normalizeAdminCallback(value: unknown): string {
  if (
    typeof value !== "string" ||
    !adminPathPattern.test(value) ||
    unsafePathCharacterPattern.test(value)
  ) {
    return defaultAdminCallback;
  }

  try {
    const url = new URL(value, "https://honeycomb.invalid");
    const rawPathname = value.split(/[?#]/, 1)[0];

    if (
      url.origin !== "https://honeycomb.invalid" ||
      !adminPathPattern.test(url.pathname) ||
      rawPathname !== url.pathname ||
      url.pathname.includes("//")
    ) {
      return defaultAdminCallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return defaultAdminCallback;
  }
}
