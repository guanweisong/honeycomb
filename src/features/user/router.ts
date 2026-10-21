import "server-only";

import { z } from "zod";
import { Permission } from "@/lib/auth/permissions";
import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
  mapApplicationError,
} from "@/lib/trpc/core";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";
import { IdSchema } from "@/lib/validation/id.schema";
import { UserListQuerySchema } from "@/features/user/schema";
import { UserInsertSchema, UserUpdateSchema } from "@/features/user/schema";
import {
  createUser,
  destroyUsers,
  updateUser,
} from "@/features/user/server/user-commands";
import { createUserRepository } from "@/features/user/server/user-repository";
import { publicContentInvalidator } from "@/lib/cache/next-public-content-invalidator";

/** 用户 API 的传输层，只负责输入、权限和业务服务编排。 */
export const userRouter = createTRPCRouter({
  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(({ ctx, input }) => createUserRepository(ctx.db).detail(input.id)),
  current: permissionProcedure(Permission.userReadSelf).query(({ ctx }) =>
    createUserRepository(ctx.db)
      .current(ctx.user.id)
      .catch(mapApplicationError),
  ),
  index: permissionProcedure(Permission.userReadAll)
    .input(UserListQuerySchema)
    .query(({ input, ctx }) => createUserRepository(ctx.db).list(input)),
  create: permissionProcedure(Permission.userManage)
    .input(UserInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createUser(
        createUserRepository(ctx.db),
        input,
        publicContentInvalidator,
      ).catch(mapApplicationError);
      return result;
    }),
  destroy: permissionProcedure(Permission.userManage)
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await destroyUsers(
        createUserRepository(ctx.db),
        input.ids,
        publicContentInvalidator,
      ).catch(mapApplicationError);
      return result;
    }),
  update: permissionProcedure(Permission.userManage)
    .input(UserUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateUser(
        createUserRepository(ctx.db),
        input,
        ctx.user.level,
        publicContentInvalidator,
      ).catch(mapApplicationError);
      return result;
    }),
});
