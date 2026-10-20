import "server-only";

import { Permission } from "@/lib/auth/permissions";
import { permissionProcedure, createTRPCRouter } from "@/lib/trpc/core";
import { MediaListQuerySchema } from "@/features/media/schema";
import { MediaInsertSchema } from "@/features/media/schema";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";
import { MediaUploadFileSchema } from "./upload-policy";
import {
  createMedia,
  destroyMedia,
  getMediaPresignedUrl,
} from "@/features/media/server";
import { createMediaRepository } from "@/features/media/server/media-repository";
import S3 from "@/lib/storage/S3";
import { publicContentInvalidator } from "@/lib/cache/refresh-path";

/** 媒体 API 的传输层，只负责输入、权限和业务服务编排。 */
export const mediaRouter = createTRPCRouter({
  index: permissionProcedure(Permission.mediaReadAll)
    .input(MediaListQuerySchema)
    .query(({ input, ctx }) => createMediaRepository(ctx.db).list(input)),
  getPresignedUrl: permissionProcedure(Permission.mediaUpload)
    .input(MediaUploadFileSchema)
    .mutation(({ input }) =>
      getMediaPresignedUrl(S3, input.name, input.type, input.size),
    ),
  upload: permissionProcedure(Permission.mediaUpload)
    .input(MediaInsertSchema)
    .mutation(({ input, ctx }) =>
      createMedia(createMediaRepository(ctx.db), input),
    ),
  destroy: permissionProcedure(Permission.mediaDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) =>
      destroyMedia(
        createMediaRepository(ctx.db),
        S3,
        input.ids,
        publicContentInvalidator,
      ),
    ),
});
