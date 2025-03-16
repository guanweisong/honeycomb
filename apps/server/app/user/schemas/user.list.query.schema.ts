import { PaginationQuerySchema } from "@/schemas/pagination.query.schema";
import { NameSchema } from "@/app/user/schemas/fields/name.schema";
import { EmailSchema } from "@/app/user/schemas/fields/email.schema";
import { StatusSchema } from "@/app/user/schemas/fields/status.schema";
import { LevelSchema } from "@/app/user/schemas/fields/level.schema";
import { z } from "zod";

export const UserListQuerySchema = PaginationQuerySchema.extend({
  name: NameSchema.optional(),
  email: EmailSchema.optional(),
  status: z.union([StatusSchema.array(), StatusSchema]).optional(),
  level: z.union([LevelSchema.array(), LevelSchema]).optional(),
});
