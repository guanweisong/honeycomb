import "server-only";

import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/auth/permissions";
import { SettingUpdateSchema } from "@/packages/trpc/api/modules/setting/schemas/setting.update.schema";
import * as schema from "@/packages/db/schema";
import { eq, InferInsertModel } from "drizzle-orm";
import { observeDbOperation } from "@/packages/observability/server";

/**
 * 网站设置相关的 tRPC 路由。
 */
export const settingRouter = createTRPCRouter({
  /**
   * 获取网站的全局设置。
   * @returns {Promise<object>} 返回一个包含所有设置的对象。
   */
  index: publicProcedure.query(async ({ ctx }) => {
    const list = await observeDbOperation("setting.get", "select", () =>
      ctx.db.select().from(schema.setting),
    );
    return list[0];
  }),

  /**
   * 更新网站设置。
   * (需要管理员权限)
   * @param {SettingUpdateSchema} input - 包含要更新的设置 ID 和新数据。
   * @returns {Promise<Setting>} 返回更新后的设置对象。
   */
  update: permissionProcedure(Permission.settingUpdate)
    .input(SettingUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedSetting] = await observeDbOperation(
        "setting.update",
        "update",
        () =>
          ctx.db
            .update(schema.setting)
            .set(rest as Partial<InferInsertModel<typeof schema.setting>>)
            .where(eq(schema.setting.id, id))
            .returning(),
      );
      return updatedSetting;
    }),
});
