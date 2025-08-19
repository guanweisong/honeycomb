import { protectedProcedure, publicProcedure, router } from "@honeycomb/trpc/server/core";
import { SettingUpdateSchema } from "@honeycomb/validation/setting/schemas/setting.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import { UserLevel } from ".prisma/client";

export const settingRouter = router({
  index: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.prisma.setting.findFirst();
    return {
      ...result,
      customObjectId: { link: process.env.LINK_OBJECT_ID },
    } as any;
  }),

  update: protectedProcedure([UserLevel.ADMIN])
    .input(UpdateSchema(SettingUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      const result = await ctx.prisma.setting.update({ where: { id }, data });
      return result;
    }),
});
