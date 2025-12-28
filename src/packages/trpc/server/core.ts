import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

/**
 * 初始化 tRPC 实例。
 * 
 * 注意：为了支持 Edge Runtime，已移除 superjson transformer。
 * 这意味着无法自动序列化 Date、Map、Set 等特殊类型。
 * 如需传输这些类型，请在应用层手动转换为 JSON 兼容格式。
 */
const t = initTRPC.context<Context>().create();

/**
 * ✅ tRPC 路由创建器
 * - 注意命名为 createTRPCRouter，避免与内置方法冲突。
 */
export const createTRPCRouter = t.router;

/**
 * 公共 procedure
 */
export const publicProcedure = t.procedure;

/**
 * 受保护的 procedure
 */
export const protectedProcedure = (levels: string[]) =>
  t.procedure.use(
    t.middleware(({ ctx, next }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (!levels.includes(user.level)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return next({ ctx: { ...ctx, user } });
    }),
  );
