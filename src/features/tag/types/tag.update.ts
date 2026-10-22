import type { TagUpdateSchema } from "@/features/tag/schemas/tag.update.schema";
import type { z } from "zod";

export type TagUpdate = z.output<typeof TagUpdateSchema>;
