import "server-only";
import {
  listLinks,
  createLink,
  destroyLinks,
  updateLink,
} from "@/features/link/server";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/lib/trpc/core";

import { Permission } from "@/lib/auth/permissions";

import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";

import {
  LinkListQuerySchema,
  LinkInsertSchema,
  LinkUpdateSchema,
} from "@/features/link/schema";

import { publicContentInvalidator } from "@/lib/cache/next-public-content-invalidator";

/** 友情链接 API 的传输层，只负责输入、权限和业务服务编排。 */
export const linkRouter = createTRPCRouter({
  index: publicProcedure
    .input(LinkListQuerySchema)
    .query(({ input, ctx }) => listLinks(ctx.db, input, "PUBLIC_ONLY")),
  adminIndex: permissionProcedure(Permission.linkReadAll)
    .input(LinkListQuerySchema)
    .query(({ input, ctx }) => listLinks(ctx.db, input, "ALL")),
  create: permissionProcedure(Permission.linkCreate)
    .input(LinkInsertSchema)
    .mutation(({ input, ctx }) =>
      createLink(ctx.db, input, publicContentInvalidator),
    ),
  destroy: permissionProcedure(Permission.linkDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) =>
      destroyLinks(ctx.db, input.ids, publicContentInvalidator),
    ),
  update: permissionProcedure(Permission.linkUpdate)
    .input(LinkUpdateSchema)
    .mutation(({ input, ctx }) =>
      updateLink(ctx.db, input, publicContentInvalidator),
    ),
});
