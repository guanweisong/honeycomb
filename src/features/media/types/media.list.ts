import type { MediaListQuerySchema } from "@/features/media/schemas/media.list.schema";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { z } from "zod";

export type MediaListInput = PaginationInput;

export type MediaIndexInput = z.output<typeof MediaListQuerySchema>;
