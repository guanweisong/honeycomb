import type { TagUpdateSchema } from "@/features/tag/schema/tag.update.schema";
import type { z } from "zod";

export type TagUpdate = z.output<typeof TagUpdateSchema>;
