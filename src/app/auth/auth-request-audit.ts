import "server-only";
import { z } from "zod";

import {
  getAuthenticationProvider,
  getAuditableSessionEvent,
  getPasswordSignInField,
  isAuthenticationPath,
} from "@/app/auth/authentication-events";
import type { LoginHistoryRecordInput } from "@/features/user/account-security/login-history";
import { getDb } from "@/lib/db/db";
import {
  findUserIdByIdentifier,
  recordLoginHistory,
  type LoginIdentifierField,
} from "@/features/user/account-security/server/login-history.repository";
import { getLogger } from "@/lib/observability/server";
import { LogEvent } from "@/lib/observability/core/names";
import {
  ANONYMOUS_CLIENT_IP,
  AUTH_CLIENT_IP_HEADER,
  getClientIp,
} from "@/lib/http/client-ip.server";

type Session = { user?: { id: string } } | null;

type AuthRequestAuditDependencies = {
  handle: (request: Request) => Promise<Response>;
  getSession: (headers: Headers) => Promise<Session>;
  findUserIdByIdentifier: (
    identifier: string,
    field: LoginIdentifierField,
  ) => Promise<string | null>;
  recordHistory: (input: LoginHistoryRecordInput) => Promise<void>;
  allowFailureAudit?: () => boolean;
  reportError?: (message: string, error: unknown) => void;
};

const credentialFailure = z.object({ code: z.string() });
const oauthPreflightErrors = new Set([
  "invalid_callback_request",
  "state_not_found",
  "state_mismatch",
  "state_security_mismatch",
]);
const nonPasswordCredentialFailures = new Set([
  "INVALID_TOKEN",
  "AUTHENTICATION_FAILED",
  "PASSKEY_NOT_FOUND",
]);

async function readBody(request: Request) {
  try {
    const body = z
      .record(z.string(), z.unknown())
      .safeParse(
        request.headers
          .get("content-type")
          ?.startsWith("application/x-www-form-urlencoded")
          ? Object.fromEntries(await request.formData())
          : await request.json(),
      );
    return body.success ? body.data : undefined;
  } catch {
    return undefined;
  }
}

async function isLoginFailure(
  request: Request,
  path: string,
  response: Response,
  field?: LoginIdentifierField,
) {
  if (response.status >= 300 && response.status < 400) {
    // OAuth callback errors redirect with an error parameter. A successful
    // sign-in sets a session cookie; its application URL can also contain one.
    if (!path.startsWith("/callback/") || request.method !== "GET")
      return false;
    const location = response.headers.get("location");
    if (
      !location ||
      response.headers
        .getSetCookie()
        .some((cookie) =>
          /^(?:__Secure-)?better-auth\.session_token=[^;]/u.test(cookie),
        )
    )
      return false;
    try {
      const callback = new URL(request.url);
      const target = new URL(location, callback);
      const error = target.searchParams.get("error");
      return Boolean(
        callback.searchParams.has("state") &&
        error &&
        !oauthPreflightErrors.has(error) &&
        (target.pathname === "/api/auth/error" ||
          callback.searchParams.get("error") === error ||
          target.searchParams.has("error_description")),
      );
    } catch {
      return false;
    }
  }
  if (response.status !== 401 && (field || response.status !== 400))
    return false;
  const result = credentialFailure.safeParse(
    await response
      .clone()
      .json()
      .catch(() => undefined),
  );
  if (!result.success) return false;
  const { code } = result.data;
  if (!field) return nonPasswordCredentialFailures.has(code);
  return field === "email"
    ? code === "INVALID_EMAIL_OR_PASSWORD"
    : code === "INVALID_USERNAME_OR_PASSWORD";
}

// One shared budget for DB-backed failures per instance, independent of IP
// rotation and Better Auth's own request limits.
let failureAuditWindow = 0;
let failuresAudited = 0;
function allowFailureAuditThisMinute() {
  const minute = Math.floor(Date.now() / 60_000);
  if (minute !== failureAuditWindow) {
    failureAuditWindow = minute;
    failuresAudited = 0;
  }
  if (failuresAudited >= 60) return false;
  failuresAudited += 1;
  return true;
}

export function createAuthRequestAuditHandler({
  handle,
  getSession,
  findUserIdByIdentifier,
  recordHistory,
  allowFailureAudit = () => true,
  reportError = () => undefined,
}: AuthRequestAuditDependencies) {
  const safelyRecord = async (input: LoginHistoryRecordInput) => {
    try {
      await recordHistory(input);
    } catch (error) {
      reportError("Failed to record authentication history", error);
    }
  };

  return async (originalRequest: Request) => {
    // The framework retains its own Request. Snapshot consumers before any
    // await so a concurrent framework read cannot consume their body.
    const handlerRequest = originalRequest.clone();
    const path =
      new URL(originalRequest.url).pathname.replace(/^\/api\/auth/, "") || "/";
    const identifierField = getPasswordSignInField(path);
    const auditRequest =
      identifierField || path === "/sign-in/social"
        ? originalRequest.clone()
        : null;
    const routeEvent = getAuditableSessionEvent(path);
    let sessionBeforeAction: Session = null;

    if (routeEvent) {
      try {
        sessionBeforeAction = await getSession(originalRequest.headers);
      } catch (error) {
        reportError(
          "Failed to resolve session for authentication history",
          error,
        );
      }
    }

    try {
      const response = await handle(handlerRequest);
      if (routeEvent && response.ok && sessionBeforeAction?.user) {
        await safelyRecord({
          event: routeEvent,
          userId: sessionBeforeAction.user.id,
          provider: "session",
          request: originalRequest,
        });
      } else if (
        isAuthenticationPath(path) &&
        (await isLoginFailure(
          originalRequest,
          path,
          response,
          identifierField,
        )) &&
        allowFailureAudit()
      ) {
        const body = auditRequest ? await readBody(auditRequest) : undefined;
        const identifier = identifierField
          ? body?.[identifierField]
          : undefined;
        let userId: string | null = null;
        if (identifierField && typeof identifier === "string") {
          try {
            userId = await findUserIdByIdentifier(identifier, identifierField);
          } catch (error) {
            reportError("Failed to resolve login history user", error);
          }
        }

        await safelyRecord({
          event: "LOGIN_FAILURE",
          userId,
          provider: getAuthenticationProvider(path, body),
          request: originalRequest,
        });
      }
      return response;
    } finally {
      if (auditRequest && !auditRequest.bodyUsed) {
        // A cancelled tee branch need not finish before the response is sent.
        void auditRequest.body?.cancel().catch(() => undefined);
      }
    }
  };
}

type AuthSessionApi = {
  api: {
    getSession: (input: { headers: Headers }) => Promise<Session>;
  };
};

export function createAppAuthRequestHandler(
  auth: AuthSessionApi,
  handle: (request: Request) => Promise<Response>,
) {
  return createAuthRequestAuditHandler({
    handle: (request) => {
      const headers = new Headers(request.headers);
      const ip = getClientIp(request);
      // Give Better Auth a shared fallback key when the ingress has no
      // trusted IP. Never forward a caller-supplied internal IP header.
      headers.set(
        AUTH_CLIENT_IP_HEADER,
        ip === ANONYMOUS_CLIENT_IP ? "0.0.0.0" : ip,
      );
      // Next's development request can be a proxy around a native Request.
      // Forward its stream without asking the constructor to unwrap its brand.
      const init = {
        method: request.method,
        headers,
        body: request.body,
        signal: request.signal,
        duplex: "half",
      };
      return handle(new Request(request.url, init));
    },
    getSession: (headers) => auth.api.getSession({ headers }),
    findUserIdByIdentifier: (identifier, field) =>
      findUserIdByIdentifier(getDb(), identifier, field),
    recordHistory: (input) => recordLoginHistory(getDb(), input),
    allowFailureAudit: allowFailureAuditThisMinute,
    reportError: (message, error) =>
      getLogger().error(LogEvent.serverError, {
        operation: "authentication-history",
        message,
        error,
      }),
  });
}
