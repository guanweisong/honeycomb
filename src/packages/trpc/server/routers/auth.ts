import { publicProcedure, createTRPCRouter } from "@/packages/trpc/server/core";
import { z } from "zod";
import { getDb } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import { and, eq } from "drizzle-orm";
import { LoginSchema } from "@/packages/validation/schemas/auth/login.schema";
import { validateCaptcha } from "@/packages/trpc/server/libs/validateCaptcha";
import { TRPCError } from "@trpc/server";

/**
 * 认证相关的 tRPC 路由。
 */
export const authRouter = createTRPCRouter({
  /**
   * 获取当前登录用户信息。
   * @returns {User | null} 如果用户已登录，则返回用户信息；否则返回 null。
   */
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ?? null;
  }),

  /**
   * 用户登录。
   * @param {LoginSchema} input - 包含用户名和密码的登录数据。
   * @returns {Promise<{ token: string }>} 返回一个包含新生成 token 的对象。
   *
   * 工作流程：
   * 1. 根据用户名和密码查询用户。
   * 2. 如果用户不存在或密码不匹配，则抛出错误。
   * 3. 生成一个随机的 UUID 作为 token。
   * 4. 将新 token 与用户 ID 关联并存入数据库。
   * 5. 返回新 token。
   */
  login: publicProcedure.input(LoginSchema).mutation(async ({ input }) => {
    const { name, password, captcha } = input;
    await validateCaptcha(captcha);
    const db = getDb();

    const [user] = await db
      .select()
      .from(schema.user)
      .where(
        and(
          eq(schema.user.name, name as string),
          eq(schema.user.password, password as string),
        ),
      )
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "用户名或密码不正确",
      });
    }

    const token = crypto.randomUUID();
    await db.insert(schema.token).values({ content: token, userId: user.id });

    return { token };
  }),

  /**
   * 用户登出。
   * @param {{ token: string }} input - 包含要注销的 token。
   * @returns {Promise<{ success: boolean }>} 返回一个表示操作成功的对象。
   *
   * 工作流程：
   * 1. 从数据库中删除指定的 token 记录。
   */
  logout: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { token } = input;
      await db.delete(schema.token).where(eq(schema.token.content, token));
      return { success: true };
    }),
});
