import "server-only";

import { initTRPC, TRPCError } from "@trpc/server";
import { LogEvent, MetricName } from "@/lib/observability/core/names";
import { serializeError } from "@/lib/observability/core/sanitize";
import { getLogger, getMetrics } from "@/lib/observability/server/registry";
import { can, isPermission, type Permission } from "@/lib/auth/permissions";
import { ApplicationError } from "@/lib/errors/application-error";
import { DomainError } from "@/lib/errors/domain-error";

import type { Context } from "@/lib/trpc/context";

/**
 * 初始化 tRPC 实例。
 *
 * 注意：为了支持 Edge Runtime，已移除 superjson transformer。
 * 这意味着无法自动序列化 Date、Map、Set 等特殊类型。
 * 如需传输这些类型，请在应用层手动转换为 JSON 兼容格式。
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ error, shape }) {
    // Unknown causes can include SQL bindings. Format at the HTTP boundary,
    // including context failures and calls with request observability disabled.
    const inheritedUnknownMessage =
      error.code === "INTERNAL_SERVER_ERROR" &&
      error.cause !== undefined &&
      !(error.cause instanceof ApplicationError) &&
      !(error.cause instanceof DomainError) &&
      error.message === error.cause.message;
    if (!inheritedUnknownMessage) return shape;
    return {
      ...shape,
      message: "Internal server error",
      data: { ...shape.data, stack: undefined },
    };
  },
});

/** 业务错误转换独立于观测开关，并在外层观测记录前完成。 */
const applicationErrorMiddleware = t.middleware(async ({ next }) => {
  const result = await next();
  if (result.ok) return result;

  const cause = result.error.cause;
  if (!(cause instanceof ApplicationError) && !(cause instanceof DomainError))
    return result;

  const code =
    cause instanceof ApplicationError
      ? cause.code
      : cause.code.includes("NOT_FOUND")
        ? "NOT_FOUND"
        : cause.code === "PROTECTED_USER"
          ? "FORBIDDEN"
          : "BAD_REQUEST";
  return {
    ...result,
    error: new TRPCError({ code, message: cause.message, cause }),
  };
});

const requestObservabilityMiddleware = t.middleware(
  async ({ ctx, next, path, type }) => {
    const observabilityEnabled = ctx.requestObservabilityEnabled !== false;

    const startedAt = Date.now();
    const baseContext = {
      requestId: ctx.requestId,
      procedure: path,
      method: type,
    };

    if (observabilityEnabled)
      getLogger().info(LogEvent.requestStarted, baseContext);

    const result = await next();
    if (!observabilityEnabled) return result;

    const durationMs = Date.now() - startedAt;
    const outcome = result.ok ? "success" : result.error.code;
    const labels = { procedure: path, method: type, outcome };
    const completedContext = { ...baseContext, durationMs, outcome };

    getMetrics().increment(MetricName.apiRequestsTotal, labels);
    getMetrics().recordDuration(
      MetricName.apiRequestDurationMs,
      durationMs,
      labels,
    );

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
  },
);

/**
 * ✅ tRPC 路由创建器
 * - 注意命名为 createTRPCRouter，避免与内置方法冲突。
 */
export const createTRPCRouter = t.router;

/**
 * 公共 procedure
 */
export const publicProcedure = t.procedure
  .use(requestObservabilityMiddleware)
  .use(applicationErrorMiddleware);

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
    (permission) => !isPermission(permission),
  );
  const mode = options.mode ?? "all";

  return publicProcedure.use(
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
