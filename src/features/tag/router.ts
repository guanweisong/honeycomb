import "server-only";
import {
  listTags,
  createTag,
  destroyTags,
  updateTag,
} from "@/features/tag/server";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/lib/trpc/core";

import { Permission } from "@/lib/auth/permissions";

import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";

import {
  TagListQuerySchema,
  TagInsertSchema,
  TagUpdateSchema,
} from "@/features/tag/schema";

import { publicContentInvalidator } from "@/lib/cache/refresh-path";

/** 标签 API 的传输层，只负责输入、权限和业务服务编排。 */
export const tagRouter = createTRPCRouter({
  index: publicProcedure
    .input(TagListQuerySchema)
    .query(({ input, ctx }) => listTags(ctx.db, input)),
  create: permissionProcedure(Permission.tagCreate)
    .input(TagInsertSchema)
    .mutation(({ input, ctx }) =>
      createTag(ctx.db, input, publicContentInvalidator),
    ),
  destroy: permissionProcedure(Permission.tagDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) =>
      destroyTags(ctx.db, input.ids, publicContentInvalidator),
    ),
  update: permissionProcedure(Permission.tagUpdate)
    .input(TagUpdateSchema)
    .mutation(({ input, ctx }) =>
      updateTag(ctx.db, input, publicContentInvalidator),
    ),
});
