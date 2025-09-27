import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { SettingUpdateSchema } from "@honeycomb/validation/setting/schemas/setting.update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq } from "drizzle-orm";

export const settingRouter = router({
  index: publicProcedure.query(async ({ ctx }) => {
    const list = await ctx.db.select().from(schema.setting);
    const result = list[0];
    return {
      ...result,
      customObjectId: { link: process.env.LINK_OBJECT_ID },
    };
  }),

  update: protectedProcedure(["ADMIN"])
    .input(SettingUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const [updatedSetting] = await ctx.db
        .update(schema.setting)
        .set(input)
        .where(eq(schema.setting.id, input.id))
        .returning();
      return updatedSetting;
    }),
});
