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
