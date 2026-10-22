import type {
  MediaRegisterUploadSchema,
  MediaUploadFileSchema,
  MediaUploadIntentInputSchema,
} from "../schemas/media.upload.schema";
import type { z } from "zod";

export type MediaUploadFile = z.output<typeof MediaUploadFileSchema>;

export type MediaUploadIntentInput = z.output<
  typeof MediaUploadIntentInputSchema
>;

export type MediaRegisterUploadInput = z.input<
  typeof MediaRegisterUploadSchema
>;
