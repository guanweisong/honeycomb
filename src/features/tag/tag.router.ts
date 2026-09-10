import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { TagListQuerySchema } from "@/features/tag/schemas/tag.list.query.schema";
import { TagInsertSchema } from "@/features/tag/schemas/tag.insert.schema";
import { TagUpdateSchema } from "@/features/tag/schemas/tag.update.schema";
import {
  getTagList,
  createTag,
  destroyTags,
  updateTag,
} from "@/features/tag/application/tag-use-cases";
import { createTagRepository } from "@/features/tag/infrastructure/tag-repository";
import { publicContentInvalidator } from "@/packages/infrastructure/refresh-path";

/** 标签 API 的传输层，只负责输入、权限和业务服务编排。 */
export const tagRouter = createTRPCRouter({
  index: publicProcedure
    .input(TagListQuerySchema)
    .query(({ input, ctx }) => getTagList(createTagRepository(ctx.db), input)),
  create: permissionProcedure(Permission.tagCreate)
    .input(TagInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createTag(
        createTagRepository(ctx.db),
        input,
        publicContentInvalidator,
      );
      return result;
    }),
  destroy: permissionProcedure(Permission.tagDelete)
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await destroyTags(
        createTagRepository(ctx.db),
        input.ids,
        publicContentInvalidator,
      );
      return result;
    }),
  update: permissionProcedure(Permission.tagUpdate)
    .input(TagUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateTag(
        createTagRepository(ctx.db),
        input,
        publicContentInvalidator,
      );
      return result;
    }),
});
