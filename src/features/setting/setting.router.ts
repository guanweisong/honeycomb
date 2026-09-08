import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { SettingUpdateSchema } from "@/features/setting/schemas/setting.update.schema";
import {
  getSetting,
  updateSetting,
} from "@/features/setting/application/setting-use-cases";
import { createSettingRepository } from "@/features/setting/infrastructure/setting-repository";
import { invalidateAllPublicContent } from "@/packages/infrastructure/refresh-path";

/** 网站设置 API 的传输层，只负责输入、权限和业务服务编排。 */
export const settingRouter = createTRPCRouter({
  index: publicProcedure.query(({ ctx }) =>
    getSetting(createSettingRepository(ctx.db)),
  ),
  update: permissionProcedure(Permission.settingUpdate)
    .input(SettingUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateSetting(
        createSettingRepository(ctx.db),
        input,
      );
      await invalidateAllPublicContent();
      return result;
    }),
});
