import "server-only";
import { Permission } from "@/lib/auth/permissions";
import {
  permissionProcedure,
  createTRPCRouter,
  mapApplicationError,
} from "@/lib/trpc/core";
import {
  MediaListQuerySchema,
  MediaIdSchema,
  MediaDeleteSchema,
  MediaReconcileSchema,
} from "./schema";
import { MediaUploadFileSchema } from "./upload-policy";
import { beginMediaUpload, confirmMediaUpload, destroyMedia } from "./server";
import { createMediaRepository } from "./server/media-repository";
import S3 from "@/lib/storage/S3";
import { publicContentInvalidator } from "@/lib/cache/refresh-path";

export const mediaRouter = createTRPCRouter({
  index: permissionProcedure(Permission.mediaReadAll)
    .input(MediaListQuerySchema)
    .query(({ input, ctx }) =>
      createMediaRepository(ctx.db).list(input, ctx.user.id),
    ),
  beginUpload: permissionProcedure(Permission.mediaUpload)
    .input(MediaUploadFileSchema)
    .mutation(({ input, ctx }) =>
      beginMediaUpload(
        createMediaRepository(ctx.db),
        S3,
        input,
        ctx.user.id,
      ).catch(mapApplicationError),
    ),
  confirmUpload: permissionProcedure(Permission.mediaUpload)
    .input(MediaIdSchema)
    .mutation(({ input, ctx }) =>
      confirmMediaUpload(
        createMediaRepository(ctx.db),
        S3,
        input.id,
        ctx.user.id,
      ).catch(mapApplicationError),
    ),
  status: permissionProcedure(Permission.mediaReadAll)
    .input(MediaIdSchema)
    .query(({ input, ctx }) =>
      createMediaRepository(ctx.db)
        .status(input.id, ctx.user.id)
        .catch(mapApplicationError),
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
  reconcile: permissionProcedure(Permission.mediaReadAll)
    .input(MediaReconcileSchema)
    .mutation(async ({ input, ctx }) => {
      const repository = createMediaRepository(ctx.db);
      try {
        const row = await repository.status(input.id, ctx.user.id);
        if (row.state === "UPLOADING" || row.state === "READY")
          return await confirmMediaUpload(
            repository,
            S3,
            input.id,
            ctx.user.id,
          );
        return await destroyMedia(
          repository,
          S3,
          [input.id],
          publicContentInvalidator,
          ctx.user.id,
          input.acknowledgeUnknownReferences === true,
        );
      } catch (error) {
        return mapApplicationError(error);
      }
    }),
});
