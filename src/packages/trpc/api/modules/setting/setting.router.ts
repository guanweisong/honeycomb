import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { SettingUpdateSchema } from "./schemas/setting.update.schema";
import { getSetting, updateSetting } from "./setting.service";

/** 网站设置 API 的传输层，只负责输入、权限和业务服务编排。 */
export const settingRouter = createTRPCRouter({
  index: publicProcedure.query(({ ctx }) => getSetting(ctx.db)),
  update: permissionProcedure(Permission.settingUpdate)
    .input(SettingUpdateSchema)
    .mutation(({ input, ctx }) => updateSetting(ctx.db, input)),
});
