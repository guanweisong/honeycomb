import "server-only";
import { Permission } from "@/lib/auth/permissions";
import {
  permissionProcedure,
  createTRPCRouter,
  mapApplicationError,
} from "@/lib/trpc/core";
import { MediaListQuerySchema } from "@/features/media/schema/media.list.schema";
import { MediaDeleteSchema } from "@/features/media/schema/media.delete.schema";
import { MediaRegisterUploadSchema } from "@/features/media/schema/media.upload.schema";
import { MediaUploadIntentInputSchema } from "@/features/media/schema/media.upload.schema";
import {
  prepareMediaUpload,
  registerMediaUpload,
} from "@/features/media/server/media-upload";
import { destroyMedia } from "@/features/media/server/media-delete";
import { createMediaRepository } from "./server/media-repository";
import R2Storage from "@/lib/storage/r2-storage";
import { publicContentInvalidator } from "@/lib/cache/next-public-content-invalidator";
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
        R2Storage,
        input,
        ctx.user.id,
      ).catch(mapApplicationError),
    ),
  registerUpload: permissionProcedure(Permission.mediaUpload)
    .input(MediaRegisterUploadSchema)
    .mutation(({ input, ctx }) =>
      registerMediaUpload(
        createMediaRepository(ctx.db),
        R2Storage,
        input.intent,
        ctx.user.id,
      ).catch(mapApplicationError),
    ),
  destroy: permissionProcedure(Permission.mediaDelete)
    .input(MediaDeleteSchema)
    .mutation(({ input, ctx }) =>
      destroyMedia(
        createMediaRepository(ctx.db),
        R2Storage,
        input.ids,
        publicContentInvalidator,
        ctx.user.id,
        input.acknowledgeUnknownReferences,
      ).catch(mapApplicationError),
    ),
});
