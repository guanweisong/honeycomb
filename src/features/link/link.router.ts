import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { LinkListQuerySchema } from "@/features/link/schemas/link.list.query.schema";
import { LinkInsertSchema } from "@/features/link/schemas/link.insert.schema";
import { LinkUpdateSchema } from "@/features/link/schemas/link.update.schema";
import {
  getLinkList,
  createLink,
  destroyLinks,
  updateLink,
} from "@/features/link/application/link-use-cases";
import { createLinkRepository } from "@/features/link/infrastructure/link-repository";

/** 友情链接 API 的传输层，只负责输入、权限和业务服务编排。 */
export const linkRouter = createTRPCRouter({
  index: publicProcedure
    .input(LinkListQuerySchema)
    .query(({ input, ctx }) =>
      getLinkList(createLinkRepository(ctx.db), input, "PUBLIC_ONLY"),
    ),
  adminIndex: permissionProcedure(Permission.linkReadAll)
    .input(LinkListQuerySchema)
    .query(({ input, ctx }) =>
      getLinkList(createLinkRepository(ctx.db), input, "ALL"),
    ),
  create: permissionProcedure(Permission.linkCreate)
    .input(LinkInsertSchema)
    .mutation(({ input, ctx }) =>
      createLink(createLinkRepository(ctx.db), input),
    ),
  destroy: permissionProcedure(Permission.linkDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) =>
      destroyLinks(createLinkRepository(ctx.db), input.ids),
    ),
  update: permissionProcedure(Permission.linkUpdate)
    .input(LinkUpdateSchema)
    .mutation(({ input, ctx }) =>
      updateLink(createLinkRepository(ctx.db), input),
    ),
});
