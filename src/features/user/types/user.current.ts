import type { UserLevel } from "./user.level";
import type { UserRecord } from "./user.record";

export interface CurrentUser {
  id: string;
  name?: string | null;
  level: UserLevel;
}

export type CurrentUserRecord = Pick<
  UserRecord,
  "id" | "email" | "level" | "name" | "status"
>;

export type AdminUser = CurrentUserRecord;
