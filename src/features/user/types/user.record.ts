import type { UserLevel } from "./user.level";
import type { UserStatus } from "./user.status";

export interface UserRecord {
  id: string;
  email: string | null;
  level: UserLevel;
  name: string | null;
  status: UserStatus;
  createdAt: string | null;
  updatedAt: string | null;
}
