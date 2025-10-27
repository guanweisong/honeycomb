import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

/**
 * 初始化 tRPC 实例。
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

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
