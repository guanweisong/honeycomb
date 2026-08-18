import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { LinkListQuerySchema } from "@/packages/trpc/api/modules/link/schemas/link.list.query.schema";
import { LinkInsertSchema } from "@/packages/trpc/api/modules/link/schemas/link.insert.schema";
import { LinkUpdateSchema } from "@/packages/trpc/api/modules/link/schemas/link.update.schema";
import { getLinkList } from "@/features/link/application/link-queries";
import { createLink, destroyLinks, updateLink } from "@/features/link/application/link-commands";

/** 友情链接 API 的传输层，只负责输入、权限和业务服务编排。 */
export const linkRouter = createTRPCRouter({
  index: publicProcedure
    .input(LinkListQuerySchema)
    .query(({ input, ctx }) =>
      getLinkList(ctx.db, input, "PUBLIC_ONLY"),
    ),
  adminIndex: permissionProcedure(Permission.linkReadAll)
    .input(LinkListQuerySchema)
    .query(({ input, ctx }) =>
      getLinkList(ctx.db, input, "ALL"),
    ),
  create: permissionProcedure(Permission.linkCreate)
    .input(LinkInsertSchema)
    .mutation(({ input, ctx }) => createLink(ctx.db, input)),
  destroy: permissionProcedure(Permission.linkDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyLinks(ctx.db, input.ids)),
  update: permissionProcedure(Permission.linkUpdate)
    .input(LinkUpdateSchema)
    .mutation(({ input, ctx }) => updateLink(ctx.db, input)),
});
