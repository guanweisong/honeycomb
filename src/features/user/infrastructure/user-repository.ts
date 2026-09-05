import "server-only";
import { repositoryPaginationDefaults } from "@/packages/application/pagination";
import {
  parseEnumValue,
  requireWriteResult,
} from "@/packages/infrastructure/db/value-validation";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";

import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
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

function validateUserState<T extends { status: unknown; level: unknown }>(
  user: T,
) {
  return {
    ...user,
    status: parseEnumValue(
      user.status,
      Object.values(UserStatus),
      "user.status",
    ),
    level: parseEnumValue(user.level, Object.values(UserLevel), "user.level"),
  };
}

export type LoginHistoryRecord = Awaited<
  ReturnType<typeof listUserLoginHistory>
>[number];

export function createUserRepository(db: Database): UserRepository {
  return {
    async getStatus(id) {
      const [user] = await observeDbOperation("user.update", "select", () =>
        db
          .select({ status: schema.user.status, level: schema.user.level })
          .from(schema.user)
          .where(eq(schema.user.id, id)),
      );
      return user ? validateUserState(user) : null;
    },
    async getStates(ids) {
      if (ids.length === 0) return [];
      const users = await observeDbOperation("user.states", "select", () =>
        db
          .select({
            id: schema.user.id,
            status: schema.user.status,
            level: schema.user.level,
          })
          .from(schema.user)
          .where(inArray(schema.user.id, ids)),
      );
      return users.map(validateUserState);
    },
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
      return validateUserState(user);
    },
    async list(input) {
      const {
        page = repositoryPaginationDefaults.page,
        limit = repositoryPaginationDefaults.limit,
        sortField,
        sortOrder,
        ...rest
      } = input;
      const where = buildDrizzleWhere(schema.user, rest, ["status", "level"]);
      const orderBy = buildDrizzleOrderBy(
        schema.user,
        sortField,
        sortOrder,
        repositoryPaginationDefaults.sortField,
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
      return {
        list: list.map(validateUserState),
        total: Number(counts[0]?.count) || 0,
      };
    },
    async create(input) {
      const { password, ...values } = input;
      return db.transaction(async (tx) => {
        const [row] = await observeDbOperation("user.create", "insert", () =>
          tx.insert(schema.user).values(values).returning(safeUserColumns),
        );
        const user = requireWriteResult(row, "create", "user");
        await setCredentialPassword(tx, user.id, password);
        return validateUserState(user);
      });
    },
    async destroy(ids) {
      await observeDbOperation("user.destroy", "delete", () =>
        db.delete(schema.user).where(inArray(schema.user.id, ids)),
      );
      return { success: true } as const;
    },
    async update(input) {
      const { id, password, ...rest } = input;
      const update = async (store: CredentialStore) => {
        const [row] = await observeDbOperation("user.update", "update", () =>
          store
            .update(schema.user)
            .set(rest)
            .where(eq(schema.user.id, id))
            .returning(safeUserColumns),
        );
        const user = requireWriteResult(row, "update", "user");
        if (password) await setCredentialPassword(store, id, password);
        return validateUserState(user);
      };
      return password ? db.transaction(update) : update(db);
    },
    async loginHistory(userId) {
      return listUserLoginHistory(db, userId);
    },
  };
}
