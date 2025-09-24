import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { SettingUpdateSchema } from "@honeycomb/validation/setting/schemas/setting.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@honeycomb/trpc/server/libs/tools";

export const settingRouter = router({
  index: publicProcedure.query(async ({ ctx }) => {
    const list = await ctx.db.select().from(schema.setting);
    const result = list[0] as any;
    return {
      ...result,
      customObjectId: { link: process.env.LINK_OBJECT_ID },
    } as any;
  }),

  update: protectedProcedure(["ADMIN"])
    .input(UpdateSchema(SettingUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as { id: string; data: any };
      const now = new Date().toISOString();
      const [updatedSetting] = await ctx.db
        .update(schema.setting)
        .set({
          ...data,
          updatedAt: now,
        } as any)
        .where(eq(schema.setting.id, id))
        .returning();
      return updatedSetting;
    }),
});
