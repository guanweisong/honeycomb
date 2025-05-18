import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { NameSchema } from "./fields/name.schema";
import { EmailSchema } from "./fields/email.schema";
import { StatusSchema } from "./fields/status.schema";
import { LevelSchema } from "./fields/level.schema";
import { z } from "zod";

export const UserListQuerySchema = PaginationQuerySchema.extend({
  name: NameSchema.optional(),
  email: EmailSchema.optional(),
  status: z.union([StatusSchema.array(), StatusSchema]).optional(),
  level: z.union([LevelSchema.array(), LevelSchema]).optional(),
});
