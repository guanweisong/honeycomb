import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { SettingUpdateSchema } from "@honeycomb/validation/setting/schemas/setting.update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, InferInsertModel } from "drizzle-orm";
import { UserLevel } from "@honeycomb/types/user/user.level";

/**
 * 网站设置相关的 tRPC 路由。
 */
export const settingRouter = router({
  /**
   * 获取网站的全局设置。
   * @returns {Promise<object>} 返回一个包含所有设置的对象。
   * 该接口会额外附加一个 `customObjectId` 对象，其中包含了从环境变量读取的友情链接页面的 ID。
   */
  index: publicProcedure.query(async ({ ctx }) => {
    const list = await ctx.db.select().from(schema.setting);
    const result = list[0];
    return {
      ...result,
      customObjectId: { link: process.env.LINK_OBJECT_ID },
    };
  }),

  /**
   * 更新网站设置。
   * (需要管理员权限)
   * @param {SettingUpdateSchema} input - 包含要更新的设置 ID 和新数据。
   * @returns {Promise<Setting>} 返回更新后的设置对象。
   */
  update: protectedProcedure([UserLevel.ADMIN])
    .input(SettingUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedSetting] = await ctx.db
        .update(schema.setting)
        .set(rest as Partial<InferInsertModel<typeof schema.setting>>)
        .where(eq(schema.setting.id, id))
        .returning();
      return updatedSetting;
    }),
});
