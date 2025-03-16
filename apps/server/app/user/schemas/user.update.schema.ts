import { UserCreateSchema } from "@/app/user/schemas/user.create.schema";

export const UserUpdateSchema = UserCreateSchema.partial();
