import { publicProcedure, router } from "@honeycomb/trpc/server/core";
import { z } from "zod";
import { db } from "@honeycomb/db";
import crypto from "node:crypto";
import * as schema from "@honeycomb/db/src/schema";
import { and, eq } from "drizzle-orm";
import { LoginSchema } from "@honeycomb/validation/auth/schemas/login.schema";

export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ?? null;
  }),

  login: publicProcedure.input(LoginSchema).mutation(async ({ input }) => {
    const { name, password } = input;
    const [user] = await db
      .select()
      .from(schema.user)
      .where(
        and(eq(schema.user.name, name), eq(schema.user.password, password)),
      )
      .limit(1);

    if (!user) {
      throw new Error("用户名或密码不正确");
    }

    const token = crypto.randomUUID();
    await db
      .insert(schema.token)
      .values({ content: token, userId: user.id } as any);

    return { token };
  }),

  logout: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const { token } = input;
      await db.delete(schema.token).where(eq(schema.token.content, token));
      return { success: true };
    }),
});
