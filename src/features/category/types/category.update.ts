import type { z } from "zod";
import type { CategoryUpdateSchema } from "@/features/category/schemas/category.update.schema";

export type CategoryUpdate = z.output<typeof CategoryUpdateSchema>;
