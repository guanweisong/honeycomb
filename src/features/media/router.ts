import "server-only";
import { Permission } from "@/lib/auth/permissions";
import {
  permissionProcedure,
  createTRPCRouter,
  mapApplicationError,
} from "@/lib/trpc/core";
import {
  MediaListQuerySchema,
  MediaDeleteSchema,
  MediaRegisterUploadSchema,
} from "./schema";
import { MediaUploadIntentInputSchema } from "./upload-policy";
import {
  prepareMediaUpload,
  registerMediaUpload,
  destroyMedia,
} from "./server";
import { createMediaRepository } from "./server/media-repository";
import S3 from "@/lib/storage/S3";
import { publicContentInvalidator } from "@/lib/cache/refresh-path";
export const mediaRouter = createTRPCRouter({
  index: permissionProcedure(Permission.mediaReadAll)
    .input(MediaListQuerySchema)
    .query(({ input, ctx }) =>
      createMediaRepository(ctx.db).list(input).catch(mapApplicationError),
    ),
  prepareUpload: permissionProcedure(Permission.mediaUpload)
    .input(MediaUploadIntentInputSchema)
    .mutation(({ input, ctx }) =>
      prepareMediaUpload(
        createMediaRepository(ctx.db),
        S3,
        input,
        ctx.user.id,
      ).catch(mapApplicationError),
    ),
  registerUpload: permissionProcedure(Permission.mediaUpload)
    .input(MediaRegisterUploadSchema)
    .mutation(({ input, ctx }) =>
      registerMediaUpload(
        createMediaRepository(ctx.db),
        S3,
        input.intent,
        ctx.user.id,
      ).catch(mapApplicationError),
    ),
  destroy: permissionProcedure(Permission.mediaDelete)
    .input(MediaDeleteSchema)
    .mutation(({ input, ctx }) =>
      destroyMedia(
        createMediaRepository(ctx.db),
        S3,
        input.ids,
        publicContentInvalidator,
        ctx.user.id,
        input.acknowledgeUnknownReferences,
      ).catch(mapApplicationError),
    ),
});
