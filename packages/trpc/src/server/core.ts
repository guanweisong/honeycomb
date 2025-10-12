import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

/**
 * 初始化 tRPC 实例。
 * - 使用 `Context` 类型来定义 tRPC 的上下文。
 * - 配置 `superjson` 作为数据转换器，以支持 Date、Map、Set 等复杂类型的序列化。
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

/**
 * tRPC 路由创建器。
 * 用于组合多个 procedure 来构建一个 API 路由。
 */
export const router = t.router;

/**
 * 公共的 tRPC procedure。
 * 任何客户端都可以访问，无需身份验证。
 */
export const publicProcedure = t.procedure;

/**
 * 创建一个受保护的 tRPC procedure，需要身份验证和权限控制。
 *
 * @param {string[]} levels - 允许访问此 procedure 的用户等级列表。
 * @returns 一个 tRPC procedure，它包含一个中间件，用于：
 *   1. 检查上下文中是否存在用户信息 (`ctx.user`)，如果不存在则抛出 `UNAUTHORIZED` 错误。
 *   2. 检查用户的等级 (`user.level`) 是否在 `levels` 参数指定的列表中，如果不在则抛出 `FORBIDDEN` 错误。
 *   3. 如果验证通过，则将用户信息传递给下一个中间件或 procedure 的 resolver。
 */
export const protectedProcedure = (levels: string[]) =>
  t.procedure.use(
    t.middleware(({ ctx, next }) => {
      const user = ctx.user as any;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (!levels.includes(user.level)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return next({ ctx: { ...ctx, user } });
    }),
  );
