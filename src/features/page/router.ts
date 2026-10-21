import "server-only";

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
  mapApplicationError,
} from "@/lib/trpc/core";
import { can, Permission } from "@/lib/auth/permissions";
import { IdSchema } from "@/lib/validation/id.schema";
import {
  PageListQuerySchema,
  PageInsertSchema,
  PageUpdateSchema,
  PageDeleteSchema,
  PageCreationResultInputSchema,
} from "@/features/page/schema";
import {
  createPage,
  destroyPages,
  incrementPageViews,
  updatePage,
  getPageCreationResult,
} from "@/features/page/server";
import {
  listPages,
  listPageSummaries,
  listPageMenuOptions,
  getPage,
} from "@/features/page/server/page-queries";
import { publicContentInvalidator } from "@/lib/cache/refresh-path";

/** 独立页面 API 的传输层，只负责输入、权限和业务服务编排。 */
export const pageRouter = createTRPCRouter({
  index: publicProcedure
    .input(PageListQuerySchema)
    .query(({ input, ctx }) => listPages(ctx.db, input, "PUBLISHED_ONLY")),
  adminIndex: permissionProcedure(Permission.pageReadAll)
    .input(PageListQuerySchema)
    .query(({ input, ctx }) =>
      listPageSummaries(
        ctx.db,
        input,
        can(ctx.user.level, Permission.pageReadUnpublished)
          ? "ALL"
          : "PUBLISHED_ONLY",
      ),
    ),
  menuOptions: permissionProcedure(Permission.pageReadAll)
    .input(PageListQuerySchema)
    .query(({ input, ctx }) =>
      listPageMenuOptions(
        ctx.db,
        input,
        can(ctx.user.level, Permission.pageReadUnpublished)
          ? "ALL"
          : "PUBLISHED_ONLY",
      ),
    ),
  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(({ input, ctx }) => getPage(ctx.db, input.id, "PUBLISHED_ONLY")),
  adminDetail: permissionProcedure(Permission.pageReadAll)
    .input(z.object({ id: IdSchema }))
    .query(({ input, ctx }) =>
      getPage(
        ctx.db,
        input.id,
        can(ctx.user.level, Permission.pageReadUnpublished)
          ? "ALL"
          : "PUBLISHED_ONLY",
      ),
    ),
  create: permissionProcedure(Permission.pageCreate)
    .input(PageInsertSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      return createPage(
        ctx.db,
        input,
        ctx.user.id,
        publicContentInvalidator,
      ).catch(mapApplicationError);
    }),
  destroy: permissionProcedure(Permission.pageDelete)
    .input(PageDeleteSchema)
    .mutation(async ({ input, ctx }) => {
      return destroyPages(
        ctx.db,
        input,
        ctx.user.id,
        publicContentInvalidator,
      ).catch(mapApplicationError);
    }),
  update: permissionProcedure(Permission.pageUpdate)
    .input(PageUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      return updatePage(
        ctx.db,
        input,
        ctx.user.id,
        publicContentInvalidator,
      ).catch(mapApplicationError);
    }),
  creationResult: permissionProcedure(Permission.pageCreate)
    .input(PageCreationResultInputSchema)
    .query(({ input, ctx }) =>
      getPageCreationResult(ctx.db, input.creationToken, ctx.user.id).catch(
        mapApplicationError,
      ),
    ),
  incrementViews: publicProcedure
    .input(z.object({ id: IdSchema }))
    .mutation(async ({ input, ctx }) => {
      const page = await incrementPageViews(ctx.db, input.id);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      return page;
    }),
});
