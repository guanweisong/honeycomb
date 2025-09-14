import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { SettingUpdateSchema } from "@honeycomb/validation/setting/schemas/setting.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";

export const settingRouter = router({
  index: publicProcedure.query(async ({ ctx }) => {
    const list = await ctx.db.tables.setting.select({});
    const result = list[0] as any;
    return {
      ...result,
      customObjectId: { link: process.env.LINK_OBJECT_ID },
    } as any;
  }),

  update: protectedProcedure(["ADMIN"])
    .input(UpdateSchema(SettingUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as any;
      await ctx.db.tables.setting.update(data as any, { id });
      return { id, ...data };
    }),
});
