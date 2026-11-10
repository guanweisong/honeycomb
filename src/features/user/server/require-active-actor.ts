import "server-only";
import { eq } from "drizzle-orm";
import { UserStatus } from "@/features/user/types/user.status";
import { can, type Permission } from "@/lib/auth/permissions";
import type { DatabaseTransaction } from "@/lib/db/transaction-begin-retry";
import { user } from "@/lib/db/schema";
import { ApplicationError } from "@/lib/errors/application-error";

/** Recheck the current actor inside the caller's transaction. */
export async function requireActiveActor(
  tx: DatabaseTransaction,
  actorId: string,
  permissions: readonly Permission[],
  message: string,
) {
  const [actor] = await tx
    .select({ level: user.level, status: user.status })
    .from(user)
    .where(eq(user.id, actorId))
    .limit(1);
  if (
    !actor ||
    actor.status !== UserStatus.ENABLE ||
    permissions.some((permission) => !can(actor.level, permission))
  ) {
    throw new ApplicationError("FORBIDDEN", message);
  }
}
