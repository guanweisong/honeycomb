import type { UserLevel } from "@/features/user/types/user.level";
import type { UserStatus } from "@/features/user/types/user.status";

export interface UserRecord {
  id: string;
  email: string | null;
  level: UserLevel;
  name: string | null;
  status: UserStatus;
  createdAt: string | null;
  updatedAt: string | null;
}
