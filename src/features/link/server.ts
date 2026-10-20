import "server-only";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { parseEnumValue, requireWriteResult } from "@/lib/db/value-validation";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { EnableStatus } from "@/lib/validation/enable-status";
import { buildDrizzleOrderBy, buildDrizzleWhere } from "@/lib/db/query/tools";
import { observeDbOperation } from "@/lib/observability/server";
import type {
  LinkInsert,
  LinkUpdate,
  LinkListInput,
  LinkVisibility,
  LinkRecord,
} from "./types";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";

function toLinkRecord(row: typeof schema.link.$inferSelect): LinkRecord {
  return {
    ...row,
    status:
      row.status === null
        ? null
        : parseEnumValue(
            row.status,
            Object.values(EnableStatus),
            "link.status",
          ),
  };
}

export async function createLink(
  db: Database,
  input: LinkInsert,
  invalidator: PublicContentInvalidator,
) {
  const [value] = await observeDbOperation("link.create", "insert", () =>
    db.insert(schema.link).values(input).returning(),
  );
  const persisted = toLinkRecord(requireWriteResult(value, "create", "link"));
  const publicSync = await invalidator.invalidate({ refreshLayout: true });
  return { ...persisted, publicSync: publicSync.state };
}

export async function updateLink(
  db: Database,
  input: LinkUpdate,
  invalidator: PublicContentInvalidator,
) {
  const { id, ...changes } = input;
  const [value] = await observeDbOperation("link.update", "update", () =>
    db
      .update(schema.link)
      .set(changes)
      .where(eq(schema.link.id, id))
      .returning(),
  );
  const persisted = toLinkRecord(requireWriteResult(value, "update", "link"));
  const publicSync = await invalidator.invalidate({ refreshLayout: true });
  return { ...persisted, publicSync: publicSync.state };
}

export async function destroyLinks(
  db: Database,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  await observeDbOperation("link.destroy", "delete", () =>
    db.delete(schema.link).where(inArray(schema.link.id, ids)),
  );
  const persisted = { success: true } as const;
  const publicSync = await invalidator.invalidate({ refreshLayout: true });
  return { ...persisted, publicSync: publicSync.state };
}

export async function listLinks(
  db: Database,
  input: LinkListInput,
  visibility: LinkVisibility,
) {
  const {
    page = repositoryPaginationDefaults.page,
    limit = repositoryPaginationDefaults.limit,
    sortField,
    sortOrder,
    status,
    ...rest
  } = input;
  let where = buildDrizzleWhere(
    schema.link,
    {
      ...rest,
      status: visibility === "ALL" ? status : undefined,
    },
    ["status"],
  );
  if (visibility === "PUBLIC_ONLY") {
    const enabled = eq(schema.link.status, EnableStatus.ENABLE);
    where = where ? and(where, enabled) : enabled;
  }
  const orderBy = buildDrizzleOrderBy(
    schema.link,
    sortField,
    sortOrder,
    repositoryPaginationDefaults.sortField,
  );
  const [list, countRows] = await Promise.all([
    observeDbOperation("link.service.list", "select", () =>
      db
        .select()
        .from(schema.link)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
    ),
    observeDbOperation("link.service.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.link)
        .where(where),
    ),
  ]);
  return {
    list: list.map(toLinkRecord),
    total: Number(countRows[0]?.count) || 0,
  };
}
