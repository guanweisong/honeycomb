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
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { UserListQuerySchema } from "@/features/user/schemas/user.list.query.schema";
import { UserInsertSchema } from "@/features/user/schemas/user.insert.schema";
import { UserUpdateSchema } from "@/features/user/schemas/user.update.schema";
import { createUser, destroyUsers, updateUser, getCurrentUser, getUserDetail, getUserList } from "@/features/user/user.service";
import { createUserRepository } from "@/features/user/infrastructure/user-repository";
import { toUserCommandPort, toUserQueryPort } from "@/features/user/infrastructure/user-repository-adapter";

/** 用户 API 的传输层，只负责输入、权限和业务服务编排。 */
export const userRouter = createTRPCRouter({
  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(({ ctx, input }) => getUserDetail(toUserQueryPort(createUserRepository(ctx.db)), input.id)),
  current: permissionProcedure(Permission.userReadSelf).query(({ ctx }) =>
    getCurrentUser(toUserQueryPort(createUserRepository(ctx.db)), ctx.user.id).catch(mapApplicationError),
  ),
  index: permissionProcedure(Permission.userReadAll)
    .input(UserListQuerySchema)
    .query(({ input, ctx }) => getUserList(toUserQueryPort(createUserRepository(ctx.db)), input)),
  create: permissionProcedure(Permission.userManage)
    .input(UserInsertSchema)
    .mutation(({ input, ctx }) => createUser(toUserCommandPort(createUserRepository(ctx.db)), input).catch(mapApplicationError)),
  destroy: permissionProcedure(Permission.userManage)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyUsers(toUserCommandPort(createUserRepository(ctx.db)), input.ids).catch(mapApplicationError)),
  update: permissionProcedure(Permission.userManage)
    .input(UserUpdateSchema)
    .mutation(({ input, ctx }) => updateUser(toUserCommandPort(createUserRepository(ctx.db)), input).catch(mapApplicationError)),
});
