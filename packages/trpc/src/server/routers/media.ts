import { protectedProcedure, router } from "@honeycomb/trpc/server/core";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@honeycomb/trpc/server/libs/tools";
import { MediaListQuerySchema } from "@honeycomb/validation/media/schemas/media.list.query.schema";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import * as schema from "@honeycomb/db/src/schema";
import { inArray, InferInsertModel, sql } from "drizzle-orm";
import {
  MediaEntity,
  MediaInsertSchema,
} from "@honeycomb/validation/media/schemas/media.insert.schema";
import dayjs from "dayjs";
import S3 from "@honeycomb/trpc/server/libs/S3";
import sizeOf from "image-size";
import { getColor } from "@honeycomb/trpc/server/libs/colorThief";

/**
 * 媒体文件相关的 tRPC 路由。
 */
export const mediaRouter = router({
  /**
   * 查询媒体文件列表（支持分页、筛选、排序）。
   * (需要任意等级的登录权限)
   * @param {MediaListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含媒体文件列表和总记录数的对象。
   */
  index: protectedProcedure(["ADMIN", "EDITOR", "GUEST"])
    .input(MediaListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
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
        .orderBy(orderByClause as any)
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
  upload: protectedProcedure(["ADMIN", "EDITOR"])
    .input(MediaInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const data: Partial<MediaEntity> = {
        name: input.name,
        size: input.size,
        type: input.type,
      };

      const keyContent = dayjs().format("YYYY/MM/DD/HHmmssSSS");
      const filenameArray = input.name!.split(".");
      const keySuffix = filenameArray[filenameArray.length - 1];
      const key = `${keyContent}.${keySuffix}`;
      const fileBuffer = Buffer.from(input.base64, "base64");

      const url = await S3.putObject({
        Key: key,
        Body: fileBuffer,
        ContentType: input.type,
      });

      if (input.type?.startsWith("image")) {
        const dimensions = sizeOf(fileBuffer);
        data.width = dimensions.width;
        data.height = dimensions.height;
        const color = await getColor(url);
        data.color = `rgb(${color.join(",")})`;
      }

      data.url = url;
      data.key = key;

      const [result] = await ctx.db
        .insert(schema.media)
        .values(data as InferInsertModel<typeof schema.media>)
        .returning();

      return result;
    }),

  /**
   * 批量删除媒体文件。
   * (需要管理员或编辑权限)
   * @param {DeleteBatchSchema} input - 包含要删除的媒体文件 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: protectedProcedure(["ADMIN", "EDITOR"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      // 1. 根据 IDs 从数据库中找出要删除的媒体对象
      const mediaToDelete = await ctx.db
        .select({
          key: schema.media.key,
        })
        .from(schema.media)
        .where(inArray(schema.media.id, input.ids));

      const keysToDelete = mediaToDelete
        .map((item) => item.key)
        .filter((key): key is string => !!key);

      // 2. 从数据库中删除记录
      await ctx.db
        .delete(schema.media)
        .where(inArray(schema.media.id, input.ids));

      // 3. 从 S3 中删除文件
      await S3.deleteMultipleObject({
        Objects: keysToDelete.map((key) => ({ Key: key })),
      });

      return { success: true };
    }),
});
