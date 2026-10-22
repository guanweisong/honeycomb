import type { TagRecordSchema } from "@/features/tag/schema/tag.record.schema";
import type { z } from "zod";

export type TagRecord = z.output<typeof TagRecordSchema>;
