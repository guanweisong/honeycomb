import "server-only";

import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/auth/permissions";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@/packages/trpc/api/utils/tools";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { TagListQuerySchema } from "@/packages/trpc/api/modules/tag/schemas/tag.list.query.schema";
import { TagInsertSchema } from "@/packages/trpc/api/modules/tag/schemas/tag.insert.schema";
import { TagUpdateSchema } from "@/packages/trpc/api/modules/tag/schemas/tag.update.schema";
import * as schema from "@/packages/db/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";
import { observeDbOperation } from "@/packages/observability/server";

/**
 * 标签相关的 tRPC 路由。
 */
export const tagRouter = createTRPCRouter({
  /**
   * 查询标签列表（支持分页、筛选、排序）。
   * @param {TagListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: object[], total: number }>} 返回一个包含标签列表和总记录数的对象。
   */
  index: publicProcedure
    .input(TagListQuerySchema)
    .query(async ({ input, ctx }) => {
      const {
        page = 1,
        limit = 10,
        sortField,
        sortOrder,
        name,
        ...rest
      } = input;
      const where = buildDrizzleWhere(
        schema.tag,
        { ...rest, name },
        ["status"],
        { name },
      );
      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.tag,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await observeDbOperation("tag.list", "select", () =>
        ctx.db
          .select()
          .from(schema.tag)
          .where(where)
          .orderBy(orderByClause)
          .limit(limit)
          .offset((page - 1) * limit),
      );

      // 查询总数
      const [countResult] = await observeDbOperation(
        "tag.count",
        "select",
        () =>
          ctx.db
            .select({ count: sql<number>`count(*)`.as("count") })
            .from(schema.tag)
            .where(where),
      );
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),

  /**
   * 创建一个新标签。
   * (需要管理员或编辑权限)
   * @param {TagInsertSchema} input - 新标签的数据。
   * @returns {Promise<Tag>} 返回新创建的标签对象。
   */
  create: permissionProcedure(Permission.tagCreate)
    .input(TagInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [newTag] = await observeDbOperation("tag.create", "insert", () =>
        ctx.db
          .insert(schema.tag)
          .values(input as InferInsertModel<typeof schema.tag>)
          .returning(),
      );
      return newTag;
    }),

  /**
   * 批量删除标签。
   * (需要管理员权限)
   * @param {DeleteBatchSchema} input - 包含要删除的标签 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: permissionProcedure(Permission.tagDelete)
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await observeDbOperation("tag.destroy", "delete", () =>
        ctx.db.delete(schema.tag).where(inArray(schema.tag.id, input.ids)),
      );
      return { success: true };
    }),

  /**
   * 更新一个标签。
   * (需要管理员或编辑权限)
   * @param {TagUpdateSchema} input - 包含要更新的标签 ID 和新数据。
   * @returns {Promise<Tag>} 返回更新后的标签对象。
   */
  update: permissionProcedure(Permission.tagUpdate)
    .input(TagUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedTag] = await observeDbOperation(
        "tag.update",
        "update",
        () =>
          ctx.db
            .update(schema.tag)
            .set(rest as Partial<InferInsertModel<typeof schema.tag>>)
            .where(eq(schema.tag.id, id))
            .returning(),
      );
      return updatedTag;
    }),
});
