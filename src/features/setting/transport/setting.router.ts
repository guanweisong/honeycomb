import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { SettingUpdateSchema } from "@/packages/trpc/api/modules/setting/schemas/setting.update.schema";
import { getSetting } from "@/features/setting/application/setting-queries";
import { updateSetting } from "@/features/setting/application/setting-commands";
import { createSettingRepository } from "@/features/setting/infrastructure/setting-repository";

/** 网站设置 API 的传输层，只负责输入、权限和业务服务编排。 */
export const settingRouter = createTRPCRouter({
  index: publicProcedure.query(({ ctx }) => getSetting(createSettingRepository(ctx.db))),
  update: permissionProcedure(Permission.settingUpdate)
    .input(SettingUpdateSchema)
    .mutation(({ input, ctx }) => updateSetting(createSettingRepository(ctx.db), input)),
});
