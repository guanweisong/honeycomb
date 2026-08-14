import "server-only";

import { z } from "zod";
import { Permission } from "@/packages/identity/auth/permissions";
import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { UserListQuerySchema } from "./schemas/user.list.query.schema";
import { UserInsertSchema } from "./schemas/user.insert.schema";
import { UserUpdateSchema } from "./schemas/user.update.schema";
import {
  getCurrentUser,
  getUserDetail,
  getUserList,
  createUser,
  destroyUsers,
  updateUser,
} from "./user.service";

/** 用户 API 的传输层，只负责输入、权限和业务服务编排。 */
export const userRouter = createTRPCRouter({
  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(({ ctx, input }) => getUserDetail(ctx.db, input.id)),
  current: permissionProcedure(Permission.userReadSelf).query(({ ctx }) =>
    getCurrentUser(ctx.db, ctx.user.id),
  ),
  index: permissionProcedure(Permission.userReadAll)
    .input(UserListQuerySchema)
    .query(({ input, ctx }) => getUserList(ctx.db, input)),
  create: permissionProcedure(Permission.userManage)
    .input(UserInsertSchema)
    .mutation(({ input, ctx }) => createUser(ctx.db, input)),
  destroy: permissionProcedure(Permission.userManage)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyUsers(ctx.db, input.ids)),
  update: permissionProcedure(Permission.userManage)
    .input(UserUpdateSchema)
    .mutation(({ input, ctx }) => updateUser(ctx.db, input)),
});
