import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { TagListQuerySchema } from "./schemas/tag.list.query.schema";
import { TagInsertSchema } from "./schemas/tag.insert.schema";
import { TagUpdateSchema } from "./schemas/tag.update.schema";
import { createTag, destroyTags, getTagList, updateTag } from "./tag.service";

/** 标签 API 的传输层，只负责输入、权限和业务服务编排。 */
export const tagRouter = createTRPCRouter({
  index: publicProcedure
    .input(TagListQuerySchema)
    .query(({ input, ctx }) => getTagList(ctx.db, input)),
  create: permissionProcedure(Permission.tagCreate)
    .input(TagInsertSchema)
    .mutation(({ input, ctx }) => createTag(ctx.db, input)),
  destroy: permissionProcedure(Permission.tagDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyTags(ctx.db, input.ids)),
  update: permissionProcedure(Permission.tagUpdate)
    .input(TagUpdateSchema)
    .mutation(({ input, ctx }) => updateTag(ctx.db, input)),
});
