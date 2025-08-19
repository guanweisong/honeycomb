import { publicProcedure, router } from "@honeycomb/trpc/server/core";
import { z } from "zod";
import { prisma } from "@honeycomb/db";
import crypto from "node:crypto";
import { NameSchema } from "@honeycomb/validation/user/schemas/fields/name.schema";
import { PasswordSchema } from "@honeycomb/validation/user/schemas/fields/password.schema";

const CaptchaSchema = z.object({
  ticket: z.string().min(1),
  randstr: z.string().min(1),
});

export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    // return current user from context (based on x-auth-token)
    return ctx.user ?? null;
  }),
  login: publicProcedure
    .input(
      z.object({
        name: NameSchema,
        password: PasswordSchema, // expected to be md5 hashed on client (as current UI does)
        captcha: CaptchaSchema.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { name, password } = input;
      // Find user by name and password (already md5 hashed client-side)
      const user = await prisma.user.findFirst({ where: { name, password } });
      if (!user) {
        throw new Error("用户名或密码不正确");
      }
      // Issue token and persist
      const token = crypto.randomUUID();
      await prisma.token.create({ data: { content: token, userId: user.id } });
      return { token };
    }),

  logout: publicProcedure
    .input(
      z.object({ token: z.string().min(1) }),
    )
    .mutation(async ({ input }) => {
      const { token } = input;
      await prisma.token.deleteMany({ where: { content: token } });
      return { success: true };
    }),
});
