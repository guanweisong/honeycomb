import type { UserRecord } from "@/features/user/types/user.record";

export type CurrentUser = Pick<UserRecord, "id" | "level"> &
  Partial<Pick<UserRecord, "name">>;

export type CurrentUserRecord = Pick<
  UserRecord,
  "id" | "email" | "level" | "name" | "status"
>;

export type AdminUser = CurrentUserRecord;
