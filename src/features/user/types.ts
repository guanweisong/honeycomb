import type {
  UserInsertSchema,
  UserUpdateSchema,
  UserListQuerySchema,
} from "./schema";
import type { z } from "zod";
import type { LoginSchema } from "./login/login.schema";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { UserLevel, UserStatus } from "@/features/user/user";

export type UserCommandInput = UserInsert;
export type UserUpdateCommandInput = UserUpdate;
export type UserListInput = PaginationInput & {
  name?: string;
  email?: string;
  status?: string[];
  level?: string[];
};
export interface UserRecord {
  id: string;
  email: string | null;
  level: UserLevel;
  name: string | null;
  status: UserStatus;
  createdAt: string | null;
  updatedAt: string | null;
}
export type CurrentUserRecord = Pick<
  UserRecord,
  "id" | "email" | "level" | "name" | "status"
>;

export type UserInsert = z.output<typeof UserInsertSchema>;
export type UserUpdate = z.output<typeof UserUpdateSchema>;
export type UserListQueryInput = z.output<typeof UserListQuerySchema>;
export type LoginValues = z.output<typeof LoginSchema>;
