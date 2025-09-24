import { publicProcedure, router } from "@honeycomb/trpc/server/core";
import { z } from "zod";
import { db } from "@honeycomb/db";
import crypto from "node:crypto";
import { NameSchema } from "@honeycomb/validation/user/schemas/fields/name.schema";
import { PasswordSchema } from "@honeycomb/validation/user/schemas/fields/password.schema";
import * as schema from "@honeycomb/db/src/schema";
import { and, eq } from "drizzle-orm";

const CaptchaSchema = z.object({
  ticket: z.string().min(1),
  randstr: z.string().min(1),
});

export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ?? null;
  }),

  login: publicProcedure
    .input(
      z.object({
        name: NameSchema as any,
        password: PasswordSchema as any,
        captcha: CaptchaSchema.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { name, password } = input;
      // Find user by name and password (already md5 hashed client-side)
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

      // Issue token and persist
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
