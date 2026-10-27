import type { MediaRecordSchema } from "@/features/media/schemas/media.record.schema";
import type { z } from "zod";

export type MediaRecord = z.output<typeof MediaRecordSchema>;
