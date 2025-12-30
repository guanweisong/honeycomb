import {
  protectedProcedure,
  createTRPCRouter,
} from "@/packages/trpc/server/core";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@/packages/trpc/server/libs/tools";
import { MediaListQuerySchema } from "@/packages/validation/media/schemas/media.list.query.schema";
import { DeleteBatchSchema } from "@/packages/validation/schemas/delete.batch.schema";
import * as schema from "@/packages/db/schema";
import { inArray, InferInsertModel, sql } from "drizzle-orm";
import { MediaInsertSchema } from "@/packages/validation/media/schemas/media.insert.schema";
import dayjs from "dayjs";
// import S3 from "@/packages/trpc/server/libs/S3";
// import sizeOf from "image-size";
// import { getColor } from "@/packages/trpc/server/libs/colorThief";
import { UserLevel } from "@/packages/types/user/user.level";

/**
 * 媒体文件相关的 tRPC 路由。
 */
export const mediaRouter = createTRPCRouter({
  /**
   * 查询媒体文件列表（支持分页、筛选、排序）。
   * (需要任意等级的登录权限)
   * @param {MediaListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含媒体文件列表和总记录数的对象。
   */
  index: protectedProcedure([
    UserLevel.ADMIN,
    UserLevel.EDITOR,
    UserLevel.GUEST,
  ])
    .input(MediaListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
      const where = buildDrizzleWhere(schema.media, rest, []);

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.media,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.media)
        .where(where)
        .orderBy(orderByClause)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.media)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),

  /**
   * 上传单个媒体文件。
   * (需要管理员或编辑权限)
   * @param {MediaInsertSchema} input - 包含文件信息的对象。
   * @returns {Promise<schema>} 返回创建后的媒体对象。
   */
  upload: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(MediaInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const apiUrl = "/api/media/upload";
      const secretKey = process.env.JWT_SECRET;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-secret-key": secretKey,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to upload media");
      }

      return await response.json();
    }),

  /**
   * 批量删除媒体文件。
   * (需要管理员或编辑权限)
   * @param {DeleteBatchSchema} input - 包含要删除的媒体文件 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      const apiUrl = "/api/media/delete";
      const secretKey = process.env.JWT_SECRET;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-secret-key": secretKey,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to delete media");
      }

      return await response.json();
    }),
});
