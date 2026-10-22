import type { MediaListQuerySchema, MediaRecordSchema } from "./schema";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { z } from "zod";

export type MediaRecord = z.output<typeof MediaRecordSchema>;

export type MediaListInput = PaginationInput;

export type MediaIndexInput = z.output<typeof MediaListQuerySchema>;
