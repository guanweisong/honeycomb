import "server-only";

import { Permission } from "@/packages/identity/auth/permissions";
import {
  permissionProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { MediaListQuerySchema } from "@/features/media/schemas/media.list.query.schema";
import { MediaInsertSchema } from "@/features/media/schemas/media.insert.schema";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { MediaUploadFileSchema } from "./application/upload-policy";
import {
  createMedia,
  destroyMedia,
  getMediaList,
  getMediaPresignedUrl,
} from "@/features/media/application/media-use-cases";
import { createMediaRepository } from "@/features/media/infrastructure/media-repository";
import S3 from "@/packages/infrastructure/storage/S3";
import { publicContentInvalidator } from "@/packages/infrastructure/refresh-path";

/** 媒体 API 的传输层，只负责输入、权限和业务服务编排。 */
export const mediaRouter = createTRPCRouter({
  index: permissionProcedure(Permission.mediaReadAll)
    .input(MediaListQuerySchema)
    .query(({ input, ctx }) =>
      getMediaList(createMediaRepository(ctx.db), input),
    ),
  getPresignedUrl: permissionProcedure(Permission.mediaUpload)
    .input(MediaUploadFileSchema)
    .mutation(({ input }) => getMediaPresignedUrl(S3, input.name, input.type, input.size)),
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
