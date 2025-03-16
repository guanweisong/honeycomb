import { CategoryCreateSchema } from "@/app/category/schemas/category.create.schema";

export const CategoryUpdateSchema = CategoryCreateSchema.partial();
