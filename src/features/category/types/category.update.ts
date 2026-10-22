import type { z } from "zod";
import type { CategoryUpdateSchema } from "../schema/category.update.schema";

export type CategoryUpdate = z.output<typeof CategoryUpdateSchema>;
