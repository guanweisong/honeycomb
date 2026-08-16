import "server-only";

import { eq, inArray } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { can, Permission } from "@/packages/identity/auth/permissions";
import {
  setCredentialPassword,
  type CredentialStore,
} from "@/packages/identity/auth/credentials";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

export class UserCommandError extends Error {
  constructor(
    public readonly code: "FORBIDDEN",
    message = code,
  ) {
    super(message);
  }
}

const safeUserColumns = {
  id: schema.user.id,
  email: schema.user.email,
  level: schema.user.level,
  name: schema.user.name,
  status: schema.user.status,
  createdAt: schema.user.createdAt,
  updatedAt: schema.user.updatedAt,
};

/** 创建用户及凭据。 */
type UserCommandInput = Pick<
  typeof schema.user.$inferInsert,
  "name" | "email" | "status" | "level"
> & { password: string };

/** 创建用户时允许写入的字段。 */
export async function createUser(db: Database, input: UserCommandInput) {
  const { password, ...values } = input;
  return db.transaction(async (tx) => {
    const [user] = await observeDbOperation("user.create", "insert", () =>
      tx
        .insert(schema.user)
        .values(values as typeof schema.user.$inferInsert)
        .returning(safeUserColumns),
    );
    await setCredentialPassword(tx, user.id, password);
    return user;
  });
}
/** 删除用户并阻止删除具备用户管理权限的目标。 */
export async function destroyUsers(db: Database, ids: string[]) {
  const targets = await db
    .select({ level: schema.user.level })
    .from(schema.user)
    .where(inArray(schema.user.id, ids));
  if (targets.some((target) => can(target.level, Permission.userManage)))
    throw new UserCommandError("FORBIDDEN");
  await observeDbOperation("user.destroy", "delete", () =>
    db.delete(schema.user).where(inArray(schema.user.id, ids)),
  );
  return { success: true as const };
}
/** 更新用户及可选凭据。 */
export async function updateUser(
  db: Database,
  input: {
    id: string;
    password?: string;
  } & Partial<Omit<UserCommandInput, "password">>,
) {
  const { id, password, ...rest } = input;
  const [target] = await db
    .select({ level: schema.user.level, status: schema.user.status })
    .from(schema.user)
    .where(eq(schema.user.id, id));
  if (
    target &&
    can(target.level, Permission.userManage) &&
    (("level" in rest &&
      rest.level &&
      !can(rest.level as string, Permission.userManage)) ||
      (rest.status !== undefined && rest.status !== target.status))
  )
    throw new UserCommandError("FORBIDDEN");
  const update = async (store: CredentialStore) => {
    const [user] = await observeDbOperation("user.update", "update", () =>
      store
        .update(schema.user)
        .set(rest as Partial<typeof schema.user.$inferInsert>)
        .where(eq(schema.user.id, id))
        .returning(safeUserColumns),
    );
    if (password) await setCredentialPassword(store, id, password);
    return user;
  };
  return password ? db.transaction(update) : update(db);
}
