import "server-only";

import { initTRPC, TRPCError } from "@trpc/server";
import { LogEvent, MetricName } from "@/packages/infrastructure/observability/core/names";
import { serializeError } from "@/packages/infrastructure/observability/core/sanitize";
import { getLogger, getMetrics } from "@/packages/infrastructure/observability/server/registry";
import {
  can,
  type Permission,
} from "@/packages/identity/auth/permissions";
import { isCapability } from "@/packages/identity/auth/capability-registry";

import type { Context } from "./context";

/**
 * 初始化 tRPC 实例。
 *
 * 注意：为了支持 Edge Runtime，已移除 superjson transformer。
 * 这意味着无法自动序列化 Date、Map、Set 等特殊类型。
 * 如需传输这些类型，请在应用层手动转换为 JSON 兼容格式。
 */
const t = initTRPC.context<Context>().create();

const requestObservabilityMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const startedAt = Date.now();
  const baseContext = {
    requestId: ctx.requestId,
    procedure: path,
    method: type,
  };

  getLogger().info(LogEvent.requestStarted, baseContext);

  const result = await next();
  const durationMs = Date.now() - startedAt;
  const outcome = result.ok ? "success" : result.error.code;
  const labels = { procedure: path, method: type, outcome };
  const completedContext = { ...baseContext, durationMs, outcome };

  getMetrics().increment(MetricName.apiRequestsTotal, labels);
  getMetrics().recordDuration(MetricName.apiRequestDurationMs, durationMs, labels);

  if (result.ok) {
    getLogger().info(LogEvent.requestCompleted, completedContext);
    return result;
  }

  getMetrics().increment(MetricName.apiErrorsTotal, labels);

  if (outcome === "INTERNAL_SERVER_ERROR") {
    getLogger().error(LogEvent.requestFailed, {
      ...completedContext,
      error: serializeError(result.error.cause ?? result.error),
    });
  } else {
    getLogger().warn(LogEvent.requestFailed, completedContext);
  }

  return result;
});

/**
 * ✅ tRPC 路由创建器
 * - 注意命名为 createTRPCRouter，避免与内置方法冲突。
 */
export const createTRPCRouter = t.router;

/**
 * 公共 procedure
 */
export const publicProcedure = t.procedure.use(requestObservabilityMiddleware);

export type PermissionMode = "all" | "any";

export interface PermissionsProcedureOptions {
  mode?: PermissionMode;
}

export const permissionsProcedure = (
  permissions: readonly Permission[],
  options: PermissionsProcedureOptions = {},
) => {
  const requiredPermissions = [...permissions];
  const hasUnknownCapability = requiredPermissions.some(
    (permission) => !isCapability(permission),
  );
  const mode = options.mode ?? "all";

  return t.procedure.use(requestObservabilityMiddleware).use(
    t.middleware(({ ctx, next, path }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const hasRequiredPermissions =
        !hasUnknownCapability &&
        requiredPermissions.length > 0 &&
        (mode === "all" || mode === "any") &&
        (mode === "all"
          ? requiredPermissions.every((permission) =>
              can(user.level, permission),
            )
          : requiredPermissions.some((permission) =>
              can(user.level, permission),
            ));

      if (!hasRequiredPermissions) {
        getLogger().warn(LogEvent.authorizationDenied, {
          requestId: ctx.requestId,
          procedure: path,
          requiredPermissions,
          mode,
          outcome: "FORBIDDEN",
        });
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return next({ ctx: { ...ctx, user } });
    }),
  );
};

export const permissionProcedure = (permission: Permission) =>
  permissionsProcedure([permission]);
