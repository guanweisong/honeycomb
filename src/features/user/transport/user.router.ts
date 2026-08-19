import "server-only";

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Permission } from "@/packages/identity/auth/permissions";
import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { UserListQuerySchema } from "@/packages/trpc/api/modules/user/schemas/user.list.query.schema";
import { UserInsertSchema } from "@/packages/trpc/api/modules/user/schemas/user.insert.schema";
import { UserUpdateSchema } from "@/packages/trpc/api/modules/user/schemas/user.update.schema";
import { createUser, destroyUsers, updateUser, UserCommandError } from "@/features/user/application/user-commands";
import { getCurrentUser, getUserDetail, getUserList, UserQueryError } from "@/features/user/application/user-queries";
import { createUserRepository } from "@/features/user/infrastructure/user-repository";

function mapUserCommandError(error: unknown): never {
  if (error instanceof UserCommandError) throw new TRPCError({ code: error.code, message: error.message });
  throw error;
}
function mapUserQueryError(error: unknown): never { if (error instanceof UserQueryError) throw new TRPCError({ code: error.code }); throw error; }

/** 用户 API 的传输层，只负责输入、权限和业务服务编排。 */
export const userRouter = createTRPCRouter({
  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(({ ctx, input }) => getUserDetail(createUserRepository(ctx.db), input.id)),
  current: permissionProcedure(Permission.userReadSelf).query(({ ctx }) =>
    getCurrentUser(createUserRepository(ctx.db), ctx.user.id).catch(mapUserQueryError),
  ),
  index: permissionProcedure(Permission.userReadAll)
    .input(UserListQuerySchema)
    .query(({ input, ctx }) => getUserList(createUserRepository(ctx.db), input)),
  create: permissionProcedure(Permission.userManage)
    .input(UserInsertSchema)
    .mutation(({ input, ctx }) => createUser(createUserRepository(ctx.db), input).catch(mapUserCommandError)),
  destroy: permissionProcedure(Permission.userManage)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyUsers(createUserRepository(ctx.db), input.ids).catch(mapUserCommandError)),
  update: permissionProcedure(Permission.userManage)
    .input(UserUpdateSchema)
    .mutation(({ input, ctx }) => updateUser(createUserRepository(ctx.db), input).catch(mapUserCommandError)),
});
