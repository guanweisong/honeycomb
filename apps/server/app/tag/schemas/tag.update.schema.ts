import { TagCreateSchema } from "@/app/tag/schemas/tag.create.schema";

export const TagUpdateSchema = TagCreateSchema.partial();
