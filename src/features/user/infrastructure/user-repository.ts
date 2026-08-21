import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { Permission } from "@/packages/identity/auth/permissions";
import { authorize } from "@/packages/identity/auth/authorize";
import {
  setCredentialPassword,
  type CredentialStore,
} from "@/packages/identity/auth/credentials";
import { listUserLoginHistory } from "@/packages/identity/account-security/server/login-history.repository";
import { ApplicationError } from "@/packages/application/errors";
import type { UserRepository } from "../application/repository";

const safeUserColumns = {
  id: schema.user.id,
  email: schema.user.email,
  level: schema.user.level,
  name: schema.user.name,
  status: schema.user.status,
  createdAt: schema.user.createdAt,
  updatedAt: schema.user.updatedAt,
};

export type LoginHistoryRecord = Awaited<
  ReturnType<typeof listUserLoginHistory>
>[number];

export function createUserRepository(db: Database): UserRepository {
  return {
    async detail(id) {
      const [user] = await observeDbOperation("user.detail", "select", () =>
        db
          .select({ id: schema.user.id, name: schema.user.name })
          .from(schema.user)
          .where(eq(schema.user.id, id))
          .limit(1),
      );
      return user ?? null;
    },
    async current(id) {
      const [user] = await observeDbOperation("user.current", "select", () =>
        db
          .select({
            id: schema.user.id,
            email: schema.user.email,
            level: schema.user.level,
            name: schema.user.name,
            status: schema.user.status,
          })
          .from(schema.user)
          .where(eq(schema.user.id, id))
          .limit(1),
      );
      if (!user) throw new ApplicationError("UNAUTHORIZED");
      return user;
    },
    async list(input) {
      const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
      const where = buildDrizzleWhere(schema.user, rest, ["status", "level"]);
      const orderBy = buildDrizzleOrderBy(
        schema.user,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );
      const [list, counts] = await Promise.all([
        observeDbOperation("user.list", "select", () =>
          db
            .select(safeUserColumns)
            .from(schema.user)
            .where(where)
            .orderBy(orderBy)
            .limit(limit)
            .offset((page - 1) * limit),
        ),
        observeDbOperation("user.count", "select", () =>
          db
            .select({ count: sql<number>`count(*)`.as("count") })
            .from(schema.user)
            .where(where),
        ),
      ]);
      return { list, total: Number(counts[0]?.count) || 0 };
    },
    async create(input) {
      const { password, ...values } = input;
      return db.transaction(async (tx) => {
        const [user] = await observeDbOperation("user.create", "insert", () =>
          tx.insert(schema.user).values(values).returning(safeUserColumns),
        );
        await setCredentialPassword(tx, user.id, password);
        return user;
      });
    },
    async destroy(ids) {
      const targets = await db
        .select({ level: schema.user.level })
        .from(schema.user)
        .where(inArray(schema.user.id, ids));
      if (
        targets.some((target) =>
          authorize({ role: target.level, permission: Permission.userManage }),
        )
      ) {
        throw new ApplicationError("FORBIDDEN");
      }
      await observeDbOperation("user.destroy", "delete", () =>
        db.delete(schema.user).where(inArray(schema.user.id, ids)),
      );
      return { success: true } as const;
    },
    async update(input) {
      const { id, password, ...rest } = input;
      const [target] = await db
        .select({ level: schema.user.level, status: schema.user.status })
        .from(schema.user)
        .where(eq(schema.user.id, id));
      if (
        target &&
        authorize({ role: target.level, permission: Permission.userManage }) &&
        (("level" in rest &&
          rest.level &&
          !authorize({
            role: rest.level as string,
            permission: Permission.userManage,
          })) ||
          (rest.status !== undefined && rest.status !== target.status))
      )
        throw new ApplicationError("FORBIDDEN");
      const update = async (store: CredentialStore) => {
        const [user] = await observeDbOperation("user.update", "update", () =>
          store
            .update(schema.user)
            .set(rest)
            .where(eq(schema.user.id, id))
            .returning(safeUserColumns),
        );
        if (password) await setCredentialPassword(store, id, password);
        return user;
      };
      return password ? db.transaction(update) : update(db);
    },
    async loginHistory(userId) {
      return listUserLoginHistory(db, userId);
    },
  };
}
