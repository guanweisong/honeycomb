import "server-only";

import { z } from "zod";
import { Permission } from "@/packages/identity/auth/permissions";
import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
  mapApplicationError,
} from "@/packages/trpc/api/core";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { UserListQuerySchema } from "@/features/user/schemas/user.list.query.schema";
import { UserInsertSchema } from "@/features/user/schemas/user.insert.schema";
import { UserUpdateSchema } from "@/features/user/schemas/user.update.schema";
import {
  createUser,
  destroyUsers,
  updateUser,
  getCurrentUser,
  getUserDetail,
  getUserList,
} from "@/features/user/application/user-use-cases";
import { createUserRepository } from "@/features/user/infrastructure/user-repository";
import {
  toUserCommandPort,
  toUserQueryPort,
} from "@/features/user/infrastructure/user-repository-adapter";
import { invalidateAllPublicContent } from "@/packages/infrastructure/refresh-path";

/** 用户 API 的传输层，只负责输入、权限和业务服务编排。 */
export const userRouter = createTRPCRouter({
  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(({ ctx, input }) =>
      getUserDetail(toUserQueryPort(createUserRepository(ctx.db)), input.id),
    ),
  current: permissionProcedure(Permission.userReadSelf).query(({ ctx }) =>
    getCurrentUser(
      toUserQueryPort(createUserRepository(ctx.db)),
      ctx.user.id,
    ).catch(mapApplicationError),
  ),
  index: permissionProcedure(Permission.userReadAll)
    .input(UserListQuerySchema)
    .query(({ input, ctx }) =>
      getUserList(toUserQueryPort(createUserRepository(ctx.db)), input),
    ),
  create: permissionProcedure(Permission.userManage)
    .input(UserInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createUser(
        toUserCommandPort(createUserRepository(ctx.db)),
        input,
      ).catch(
        mapApplicationError,
      );
      await invalidateAllPublicContent();
      return result;
    }),
  destroy: permissionProcedure(Permission.userManage)
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await destroyUsers(
        toUserCommandPort(createUserRepository(ctx.db)),
        input.ids,
      ).catch(mapApplicationError);
      await invalidateAllPublicContent();
      return result;
    }),
  update: permissionProcedure(Permission.userManage)
    .input(UserUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateUser(
        toUserCommandPort(createUserRepository(ctx.db)),
        input,
        ctx.user.level,
      ).catch(
        mapApplicationError,
      );
      await invalidateAllPublicContent();
      return result;
    }),
});
