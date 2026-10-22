import type {
  MediaUploadFileSchema,
  MediaUploadIntentInputSchema,
} from "../schema/media.upload.schema";
import type { z } from "zod";

export type MediaUploadFile = z.output<typeof MediaUploadFileSchema>;

export type MediaUploadIntentInput = z.output<
  typeof MediaUploadIntentInputSchema
>;
