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

/** 标签 API 的传输层，只负责输入、权限和业务服务编排。 */
export const tagRouter = createTRPCRouter({
  index: publicProcedure
    .input(TagListQuerySchema)
    .query(({ input, ctx }) => getTagList(createTagRepository(ctx.db), input)),
  create: permissionProcedure(Permission.tagCreate)
    .input(TagInsertSchema)
    .mutation(({ input, ctx }) =>
      createTag(createTagRepository(ctx.db), input),
    ),
  destroy: permissionProcedure(Permission.tagDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) =>
      destroyTags(createTagRepository(ctx.db), input.ids),
    ),
  update: permissionProcedure(Permission.tagUpdate)
    .input(TagUpdateSchema)
    .mutation(({ input, ctx }) =>
      updateTag(createTagRepository(ctx.db), input),
    ),
});
