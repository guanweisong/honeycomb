import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";
import { UserLevel } from ".prisma/client";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = (levels: UserLevel[]) =>
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
