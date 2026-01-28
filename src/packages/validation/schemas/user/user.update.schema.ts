import { UserInsertSchema } from "@/packages/validation/schemas/user/user.insert.schema";
import { IdSchema } from "@/packages/validation/utils/fields/id.schema";
import { CleanZod } from "@/packages/validation/utils/clean.zod";

/**
 * 更新用户时的数据验证 schema。
 */
export const UserUpdateSchema = UserInsertSchema.partial().extend({
  id: IdSchema,
});

export type UserUpdate = CleanZod<typeof UserUpdateSchema>;
