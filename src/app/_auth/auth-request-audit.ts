import "server-only";
import { z } from "zod";

import {
  getAuthenticationProvider,
  getAuditableSessionEvent,
  isAuthenticationPath,
} from "./authentication-events";
import type { LoginHistoryRecordInput } from "@/features/user/account-security/login-history";
import { getDb } from "@/lib/db/db";
import {
  findUserIdByIdentifier,
  recordLoginHistory,
  type LoginIdentifierField,
} from "@/features/user/account-security/server/login-history.repository";
import { getLogger } from "@/lib/observability/server";
import { LogEvent } from "@/lib/observability/core/names";

type Session = { user?: { id: string } } | null;

type AuthRequestAuditDependencies = {
  handle: (request: Request) => Promise<Response>;
  getSession: (headers: Headers) => Promise<Session>;
  findUserIdByIdentifier: (
    identifier: string,
    field: LoginIdentifierField,
  ) => Promise<string | null>;
  recordHistory: (input: LoginHistoryRecordInput) => Promise<void>;
  reportError?: (message: string, error: unknown) => void;
};

async function readBody(request: Request) {
  try {
    const body = z
      .record(z.string(), z.unknown())
      .safeParse(await request.json());
    return body.success ? body.data : undefined;
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

  return async (originalRequest: Request) => {
    // Snapshot both consumers before either reads. The framework retains its
    // original Request; asynchronous audit work must not expose it to auth.
    const handlerRequest = originalRequest.clone();
    const request = originalRequest.clone();
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

    const response = await handle(handlerRequest);

    if (routeEvent && response.ok && sessionBeforeAction?.user) {
      await safelyRecord({
        event: routeEvent,
        userId: sessionBeforeAction.user.id,
        provider: "session",
        request,
      });
    } else if (isAuthenticationPath(path) && !response.ok) {
      const identifierField =
        path === "/sign-in/username"
          ? "username"
          : path === "/sign-in/email"
            ? "email"
            : undefined;
      const identifier = identifierField ? body?.[identifierField] : undefined;
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
    findUserIdByIdentifier: (identifier, field) =>
      findUserIdByIdentifier(getDb(), identifier, field),
    recordHistory: (input) => recordLoginHistory(getDb(), input),
    reportError: (message, error) =>
      getLogger().error(LogEvent.serverError, {
        operation: "authentication-history",
        message,
        error,
      }),
  });
}
