import type { PaginationInput } from "@/lib/validation/pagination";
import type { UserLevel, UserStatus } from "@/features/user/user";
import type { UserInsert, UserUpdate } from "./schema";

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
