import "server-only";
import { listTags } from "@/features/tag/server/tag-queries";
import {
  createTag,
  destroyTags,
  updateTag,
} from "@/features/tag/server/tag-commands";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/lib/trpc/core";

import { Permission } from "@/lib/auth/permissions";

import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";

import { TagListQuerySchema } from "@/features/tag/schemas/tag.list.schema";
import { TagInsertSchema } from "@/features/tag/schemas/tag.insert.schema";
import { TagUpdateSchema } from "@/features/tag/schemas/tag.update.schema";

import { publicContentInvalidator } from "@/lib/cache/next-public-content-invalidator";

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
