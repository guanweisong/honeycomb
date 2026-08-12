import type { LoginHistoryEvent } from "@/packages/identity/account-security/login-history";

const AUTHENTICATION_PATHS = new Set([
  "/sign-in/username",
  "/sign-in/email",
  "/sign-in/passkey",
  "/sign-in/social",
  "/passkey/verify-authentication",
]);

export function getAuthenticationProvider(
  path: string,
  body?: Record<string, unknown>,
  params?: Record<string, unknown>,
): string | null {
  if (path === "/sign-in/username" || path === "/sign-in/email")
    return "password";
  if (
    path === "/sign-in/passkey" ||
    path === "/passkey/verify-authentication"
  )
    return "passkey";
  if (path === "/sign-in/social") {
    return typeof body?.provider === "string" ? body.provider : "oauth";
  }

  if (path === "/callback/:id" && typeof params?.id === "string") {
    return params.id;
  }

  const callbackMatch = path.match(/^\/callback\/([^/:]+)$/);
  if (callbackMatch) return callbackMatch[1];

  return null;
}

export function isAuthenticationPath(path: string) {
  return AUTHENTICATION_PATHS.has(path) || /^\/callback\/[^/]+$/.test(path);
}

export function getAuditableSessionEvent(
  path: string,
): Extract<LoginHistoryEvent, "SIGN_OUT" | "REVOKE_OTHER_SESSIONS"> | null {
  if (path === "/sign-out") return "SIGN_OUT";
  if (path === "/revoke-other-sessions") return "REVOKE_OTHER_SESSIONS";
  return null;
}
