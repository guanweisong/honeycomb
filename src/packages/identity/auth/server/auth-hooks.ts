import "server-only";

import type { BetterAuthOptions } from "better-auth";
import { eq } from "drizzle-orm";
import { getDb } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { getAuthenticationProvider } from "../authentication-events";
import { recordLoginHistory } from "@/packages/identity/account-security/server/login-history.repository";
import { getLogger } from "@/packages/infrastructure/observability/server";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";

export function createAuthDatabaseHooks(): NonNullable<
  BetterAuthOptions["databaseHooks"]
> {
  return {
    user: {
      create: {
        before: async (user) => {
          const baseName =
            user.name?.trim().slice(0, 32) ||
            user.email.split("@")[0] ||
            "user";

          for (let attempt = 0; attempt < 20; attempt += 1) {
            const candidate =
              attempt === 0
                ? baseName
                : `${baseName.slice(0, Math.max(1, 32 - String(attempt).length - 1))}_${attempt}`;
            const [existing] = await getDb()
              .select({ id: schema.user.id })
              .from(schema.user)
              .where(eq(schema.user.name, candidate))
              .limit(1);

            if (!existing) return { data: { ...user, name: candidate } };
          }

          throw new Error("无法为 OAuth 用户生成唯一用户名");
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const [user] = await getDb()
            .select({ status: schema.user.status })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
            .limit(1);

          if (!user || user.status !== "ENABLE") return false;
        },
        after: async (session, context) => {
          try {
            await recordLoginHistory(getDb(), {
              event: "LOGIN_SUCCESS",
              userId: session.userId,
              provider: getAuthenticationProvider(
                context?.path ?? "",
                context?.body as Record<string, unknown> | undefined,
                context?.params as Record<string, unknown> | undefined,
              ),
              request: context?.request,
            });
          } catch (error) {
            getLogger().error(LogEvent.serverError, {
              operation: "authentication-history",
              message: "Failed to record login success history",
              error,
            });
          }
        },
      },
    },
  };
}
