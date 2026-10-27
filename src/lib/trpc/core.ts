import "server-only";

import { initTRPC, TRPCError } from "@trpc/server";
import { LogEvent, MetricName } from "@/lib/observability/core/names";
import { serializeError } from "@/lib/observability/core/sanitize";
import { getLogger, getMetrics } from "@/lib/observability/server/registry";
import type { Permission } from "@/lib/auth/permissions";
import { isCapability } from "@/lib/auth/capability-registry";
import { authorize } from "@/lib/auth/authorize";
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

    const response = await next();
    const applicationError =
      !response.ok && response.error.cause instanceof ApplicationError
        ? response.error.cause
        : undefined;
    const result =
      !response.ok && applicationError
        ? {
            ...response,
            error: new TRPCError({
              code: applicationError.code,
              message: applicationError.message,
              cause: applicationError,
            }),
          }
        : response;
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
              authorize({ role: user.level, permission }),
            )
          : requiredPermissions.some((permission) =>
              authorize({ role: user.level, permission }),
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

/** 将应用层错误统一转换为 tRPC 错误，保留未知错误交给全局错误处理。 */
export function mapApplicationError(error: unknown): never {
  if (error instanceof ApplicationError) {
    throw new TRPCError({ code: error.code, message: error.message });
  }
  if (error instanceof DomainError) {
    const code = error.code.includes("NOT_FOUND")
      ? "NOT_FOUND"
      : error.code === "PROTECTED_USER"
        ? "FORBIDDEN"
        : "BAD_REQUEST";
    throw new TRPCError({ code, message: error.message });
  }
  throw error;
}
