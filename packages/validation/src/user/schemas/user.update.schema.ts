import { UserCreateSchema } from "./user.create.schema";

export const UserUpdateSchema = UserCreateSchema.partial();
