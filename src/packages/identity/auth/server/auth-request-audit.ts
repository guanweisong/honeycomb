import "server-only";

import {
  getAuthenticationProvider,
  getAuditableSessionEvent,
  isAuthenticationPath,
} from "../authentication-events";
import type { LoginHistoryRecordInput } from "@/packages/identity/account-security/login-history";
import { getDb } from "@/packages/infrastructure/db/db";
import {
  findUserIdByIdentifier,
  recordLoginHistory,
} from "@/packages/identity/account-security/server/login-history.repository";
import { getLogger } from "@/packages/infrastructure/observability/server";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";

type Session = { user?: { id: string } } | null;

type AuthRequestAuditDependencies = {
  handle: (request: Request) => Promise<Response>;
  getSession: (headers: Headers) => Promise<Session>;
  findUserIdByIdentifier: (identifier: string) => Promise<string | null>;
  recordHistory: (input: LoginHistoryRecordInput) => Promise<void>;
  reportError?: (message: string, error: unknown) => void;
};

async function readBody(request: Request) {
  try {
    const body = await request.clone().json();
    return body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export function createAuthRequestAuditHandler({
  handle,
  getSession,
  findUserIdByIdentifier,
  recordHistory,
  reportError = () => undefined,
}: AuthRequestAuditDependencies) {
  const safelyRecord = async (input: LoginHistoryRecordInput) => {
    try {
      await recordHistory(input);
    } catch (error) {
      reportError("Failed to record authentication history", error);
    }
  };

  return async (request: Request) => {
    const path =
      new URL(request.url).pathname.replace(/^\/api\/auth/, "") || "/";
    const body = await readBody(request);
    const routeEvent = getAuditableSessionEvent(path);
    let sessionBeforeAction: Session = null;

    if (routeEvent) {
      try {
        sessionBeforeAction = await getSession(request.headers);
      } catch (error) {
        reportError(
          "Failed to resolve session for authentication history",
          error,
        );
      }
    }

    const response = await handle(request);

    if (routeEvent && response.ok && sessionBeforeAction?.user) {
      await safelyRecord({
        event: routeEvent,
        userId: sessionBeforeAction.user.id,
        provider: "session",
        request,
      });
    } else if (isAuthenticationPath(path) && !response.ok) {
      const identifier = body?.username ?? body?.email;
      let userId: string | null = null;
      if (path === "/sign-in/username" && typeof identifier === "string") {
        try {
          userId = await findUserIdByIdentifier(identifier);
        } catch (error) {
          reportError("Failed to resolve login history user", error);
        }
      }

      await safelyRecord({
        event: "LOGIN_FAILURE",
        userId,
        provider: getAuthenticationProvider(path, body),
        request,
      });
    }

    return response;
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
    handle,
    getSession: (headers) => auth.api.getSession({ headers }),
    findUserIdByIdentifier: (identifier) =>
      findUserIdByIdentifier(getDb(), identifier),
    recordHistory: (input) => recordLoginHistory(getDb(), input),
    reportError: (message, error) =>
      getLogger().error(LogEvent.serverError, {
        operation: "authentication-history",
        message,
        error,
      }),
  });
}
