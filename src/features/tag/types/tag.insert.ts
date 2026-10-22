import type { TagInsertSchema } from "@/features/tag/schema/tag.insert.schema";
import type { z } from "zod";

export type TagInsert = TagInsertInput & { id?: string };

export type TagInsertInput = z.output<typeof TagInsertSchema>;
