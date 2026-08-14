import "server-only";

import { z } from "zod";
import { Permission } from "@/packages/identity/auth/permissions";
import {
  permissionProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { MediaListQuerySchema } from "./schemas/media.list.query.schema";
import { MediaInsertSchema } from "./schemas/media.insert.schema";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { requiredString } from "@/packages/trpc/api/schemas/required.string.schema";
import {
  createMedia,
  destroyMedia,
  getMediaList,
  getMediaPresignedUrl,
} from "./media.service";

/** 媒体 API 的传输层，只负责输入、权限和业务服务编排。 */
export const mediaRouter = createTRPCRouter({
  index: permissionProcedure(Permission.mediaReadAll)
    .input(MediaListQuerySchema)
    .query(({ input, ctx }) => getMediaList(ctx.db, input)),
  getPresignedUrl: permissionProcedure(Permission.mediaUpload)
    .input(
      z.object({
        name: requiredString("文件名不能为空"),
        type: requiredString("文件类型不能为空"),
      }),
    )
    .mutation(({ input }) => getMediaPresignedUrl(input.name, input.type)),
  upload: permissionProcedure(Permission.mediaUpload)
    .input(MediaInsertSchema)
    .mutation(({ input, ctx }) => createMedia(ctx.db, input)),
  destroy: permissionProcedure(Permission.mediaDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyMedia(ctx.db, input.ids)),
});
