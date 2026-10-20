import "server-only";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { parseEnumValue, requireWriteResult } from "@/lib/db/value-validation";
import { UserLevel, UserStatus } from "@/features/user/user";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/lib/db/query/query-builders";
import { observeDbOperation } from "@/lib/observability/server";
import {
  setCredentialPassword,
  type CredentialStore,
} from "@/lib/auth/credentials";
import { ApplicationError } from "@/lib/errors/application-error";
import { assertUserLevelChange, isProtectedUser } from "../rules";
import type {
  UserCommandInput,
  UserUpdateCommandInput,
  UserListInput,
} from "../types";

export type UserRepository = ReturnType<typeof createUserRepository>;

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

export function createUserRepository(db: Database) {
  return {
    async getStatus(id: string) {
      const [user] = await observeDbOperation("user.update", "select", () =>
        db
          .select({ status: schema.user.status, level: schema.user.level })
          .from(schema.user)
          .where(eq(schema.user.id, id)),
      );
      return user ? validateUserState(user) : null;
    },
    async getStates(ids: string[]) {
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
    async detail(id: string) {
      const [user] = await observeDbOperation("user.detail", "select", () =>
        db
          .select({ id: schema.user.id, name: schema.user.name })
          .from(schema.user)
          .where(eq(schema.user.id, id))
          .limit(1),
      );
      return user ?? null;
    },
    async current(id: string) {
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
    async list(input: UserListInput) {
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
    async create(input: UserCommandInput) {
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
    async destroy(ids: string[]) {
      // libSQL transactions acquire the write lock before the first read.
      // Promotion and deletion therefore serialize around this entire batch.
      await db.transaction(async (tx) => {
        const [admin] = await tx
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(
            and(
              inArray(schema.user.id, ids),
              eq(schema.user.level, UserLevel.ADMIN),
            ),
          )
          .limit(1);
        if (admin) throw new ApplicationError("FORBIDDEN", "不能删除管理员");
        await observeDbOperation("user.destroy", "delete", () =>
          tx.delete(schema.user).where(inArray(schema.user.id, ids)),
        );
      });
      return { success: true } as const;
    },
    async update(input: UserUpdateCommandInput) {
      const { id, password, ...rest } = input;
      const protectsLevel = !!rest.level && !isProtectedUser(rest.level);
      const update = async (
        store: CredentialStore & Pick<Database, "delete">,
      ) => {
        if (protectsLevel && rest.level) {
          // The write transaction serializes this guard with competing promotions.
          const [current] = await observeDbOperation(
            "user.update",
            "select",
            () =>
              store
                .select({ level: schema.user.level })
                .from(schema.user)
                .where(eq(schema.user.id, id)),
          );
          if (current) {
            assertUserLevelChange(
              id,
              parseEnumValue(
                current.level,
                Object.values(UserLevel),
                "user.level",
              ),
              rest.level,
            );
          }
        }
        const [row] = await observeDbOperation("user.update", "update", () =>
          store
            .update(schema.user)
            .set({ ...rest, updatedAt: new Date().toISOString() })
            .where(eq(schema.user.id, id))
            .returning(safeUserColumns),
        );
        const user = requireWriteResult(row, "update", "user");
        if (password) {
          await setCredentialPassword(store, id, password);
          await observeDbOperation("user.update", "delete", () =>
            store.delete(schema.session).where(eq(schema.session.userId, id)),
          );
        }
        return validateUserState(user);
      };
      return password || protectsLevel ? db.transaction(update) : update(db);
    },
  };
}
