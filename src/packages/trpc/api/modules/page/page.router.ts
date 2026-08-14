import "server-only";

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { PageListQuerySchema } from "./schemas/page.list.query.schema";
import { PageInsertSchema } from "./schemas/page.insert.schema";
import { PageUpdateSchema } from "./schemas/page.update.schema";
import { ContentVisibility } from "@/packages/trpc/api/types/content-visibility";
import {
  createPage,
  destroyPages,
  getPageDetail,
  getPageList,
  incrementPageViews,
  updatePage,
} from "./page.service";

/** 独立页面 API 的传输层，只负责输入、权限和业务服务编排。 */
export const pageRouter = createTRPCRouter({
  index: publicProcedure
    .input(PageListQuerySchema)
    .query(({ input, ctx }) =>
      getPageList(ctx.db, input, ContentVisibility.PUBLISHED_ONLY),
    ),
  adminIndex: permissionProcedure(Permission.pageReadAll)
    .input(PageListQuerySchema)
    .query(({ input, ctx }) =>
      getPageList(ctx.db, input, ContentVisibility.ALL),
    ),
  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      return getPageDetail(ctx.db, input.id, ContentVisibility.PUBLISHED_ONLY);
    }),
  adminDetail: permissionProcedure(Permission.pageReadAll)
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      return getPageDetail(ctx.db, input.id, ContentVisibility.ALL);
    }),
  create: permissionProcedure(Permission.pageCreate)
    .input(PageInsertSchema)
    .mutation(({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      return createPage(ctx.db, input, ctx.user.id);
    }),
  destroy: permissionProcedure(Permission.pageDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyPages(ctx.db, input.ids)),
  update: permissionProcedure(Permission.pageUpdate)
    .input(PageUpdateSchema)
    .mutation(({ input, ctx }) => updatePage(ctx.db, input)),
  incrementViews: publicProcedure
    .input(z.object({ id: IdSchema }))
    .mutation(async ({ input, ctx }) => {
      const page = await incrementPageViews(ctx.db, input.id);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      return page;
    }),
});
