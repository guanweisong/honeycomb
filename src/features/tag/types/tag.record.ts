import type { TagRecordSchema } from "@/features/tag/schemas/tag.record.schema";
import type { z } from "zod";

export type TagRecord = z.output<typeof TagRecordSchema>;
