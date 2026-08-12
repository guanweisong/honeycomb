import "server-only";

import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { LinkListQuerySchema } from "@/packages/trpc/api/modules/link/schemas/link.list.query.schema";
import { LinkInsertSchema } from "@/packages/trpc/api/modules/link/schemas/link.insert.schema";
import { LinkUpdateSchema } from "@/packages/trpc/api/modules/link/schemas/link.update.schema";
import * as schema from "@/packages/infrastructure/db/schema";
import { eq, inArray, InferInsertModel } from "drizzle-orm";
import { getLinkList } from "@/packages/trpc/api/modules/link/link.service";
import { ResourceVisibility } from "@/packages/trpc/api/types/resource-visibility";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

/**
 * 友情链接相关的 tRPC 路由。
 */
export const linkRouter = createTRPCRouter({
  /**
   * 查询友情链接列表（支持分页、筛选、排序）。
   * @param {LinkListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: object[], total: number }>} 返回一个包含链接列表和总记录数的对象。
   */
  index: publicProcedure
    .input(LinkListQuerySchema)
    .query(({ input, ctx }) =>
      getLinkList(ctx.db, input, ResourceVisibility.PUBLIC_ONLY),
    ),

  adminIndex: permissionProcedure(Permission.linkReadAll)
    .input(LinkListQuerySchema)
    .query(({ input, ctx }) =>
      getLinkList(ctx.db, input, ResourceVisibility.ALL),
    ),

  /**
   * 创建一个新的友情链接。
   * (需要管理员权限)
   * @param {LinkInsertSchema} input - 新链接的数据。
   * @returns {Promise<Link>} 返回新创建的链接对象。
   */
  create: permissionProcedure(Permission.linkCreate)
    .input(LinkInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [newLink] = await observeDbOperation("link.create", "insert", () =>
        ctx.db
          .insert(schema.link)
          .values(input as InferInsertModel<typeof schema.link>)
          .returning(),
      );
      return newLink;
    }),

  /**
   * 批量删除友情链接。
   * (需要管理员权限)
   * @param {DeleteBatchSchema} input - 包含要删除的链接 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: permissionProcedure(Permission.linkDelete)
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await observeDbOperation("link.destroy", "delete", () =>
        ctx.db.delete(schema.link).where(inArray(schema.link.id, input.ids)),
      );
      return { success: true };
    }),

  /**
   * 更新一个友情链接。
   * (需要管理员权限)
   * @param {LinkUpdateSchema} input - 包含要更新的链接 ID 和新数据。
   * @returns {Promise<Link>} 返回更新后的链接对象。
   */
  update: permissionProcedure(Permission.linkUpdate)
    .input(LinkUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedLink] = await observeDbOperation(
        "link.update",
        "update",
        () =>
          ctx.db
            .update(schema.link)
            .set(rest as Partial<InferInsertModel<typeof schema.link>>)
            .where(eq(schema.link.id, id))
            .returning(),
      );
      return updatedLink;
    }),
});
