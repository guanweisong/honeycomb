import "server-only";
import { and, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { SQL_ID_CHUNK_SIZE } from "@/lib/db/query/parameter-limits";
import { transactionWithBeginRetry } from "@/lib/db/transaction-begin-retry";
import { observeDbOperation } from "@/lib/observability/server";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import { can, Permission } from "@/lib/auth/permissions";
import { UserStatus } from "@/features/user/types/user.status";
import { ApplicationError } from "@/lib/errors/application-error";
import { MenuType } from "../types/menu.type";
import type { MenuInput } from "../types/menu.write";
import type { MenuSaveSnapshot } from "../types/menu.save-snapshot";
import { MenuSaveSnapshotSchema } from "../schema/menu.save-snapshot.schema";
import { readMenuChunks } from "./menu-queries";

// Insert budgets count every bound column, including generated timestamps.
const menuInsertChunkSize = Math.max(
  1,
  Math.floor(
    SQL_ID_CHUNK_SIZE / Object.keys(getTableColumns(schema.menu)).length,
  ),
);

const busyMessage = "保存暂时繁忙，请核对最新版本后重试";

function validateMenuTree(input: MenuInput): void {
  const ids = new Set<string>();
  for (const item of input) {
    if (ids.has(item.id))
      throw new ApplicationError("BAD_REQUEST", "菜单 ID 不能重复");
    ids.add(item.id);
  }

  const parents = new Map(input.map((item) => [item.id, item.parent ?? null]));
  for (const item of input) {
    if (item.parent === undefined || item.parent === null) continue;
    if (item.parent === item.id)
      throw new ApplicationError("BAD_REQUEST", "菜单不能将自己设置为父节点");
    if (!ids.has(item.parent))
      throw new ApplicationError("BAD_REQUEST", "菜单父节点不存在");
  }

  for (const item of input) {
    const visited = new Set<string>();
    let current: string | null | undefined = item.id;
    while (current) {
      if (visited.has(current))
        throw new ApplicationError("BAD_REQUEST", "菜单父子关系不能形成循环");
      visited.add(current);
      current = parents.get(current);
    }
  }
}

/** 整树替换与单例版本 CAS 共用事务；重新鉴权和目标检查失败时，版本推进也一并回滚。 */
export async function saveAllMenus(
  db: Database,
  submitted: MenuSaveSnapshot,
  actorId: string,
  invalidator: PublicContentInvalidator,
) {
  const parsed = MenuSaveSnapshotSchema.safeParse(submitted);
  if (!parsed.success)
    throw new ApplicationError("BAD_REQUEST", "菜单保存输入不合法");
  const { items: input, expectedVersion } = parsed.data;
  validateMenuTree(input);

  const persisted = await observeDbOperation(
    "menu.save-all",
    "transaction",
    () =>
      transactionWithBeginRetry(db, busyMessage, async (tx) => {
        const [actor] = await tx
          .select({ level: schema.user.level, status: schema.user.status })
          .from(schema.user)
          .where(eq(schema.user.id, actorId))
          .limit(1);
        if (
          !actor ||
          actor.status !== UserStatus.ENABLE ||
          !can(actor.level, Permission.menuUpdate)
        )
          throw new ApplicationError("FORBIDDEN", "当前账户无权保存菜单");
        const [revision] = await tx
          .update(schema.menuRevision)
          .set({ version: sql`${schema.menuRevision.version} + 1` })
          .where(
            and(
              eq(schema.menuRevision.singletonKey, 1),
              eq(schema.menuRevision.version, expectedVersion),
            ),
          )
          .returning({ version: schema.menuRevision.version });
        if (!revision)
          throw new ApplicationError(
            "CONFLICT",
            "菜单已有更新，请核对最新版本",
          );
        for (const type of [MenuType.CATEGORY, MenuType.PAGE]) {
          const ids = input
            .filter((item) => item.type === type)
            .map((item) => item.id);
          if (!ids.length) continue;
          const target =
            type === MenuType.CATEGORY ? schema.category : schema.page;
          const targets = await readMenuChunks(ids, (chunk) =>
            tx
              .select({ id: target.id })
              .from(target)
              .where(inArray(target.id, chunk)),
          );
          if (targets.length !== ids.length)
            throw new ApplicationError(
              "BAD_REQUEST",
              "菜单目标不存在，请移除失效菜单后保存",
            );
        }
        await tx.delete(schema.menu);
        const rowIdByBusinessId = new Map(
          input.map((item) => [item.id, crypto.randomUUID()]),
        );
        const rows = input.map(({ id, type, parent, power }) => {
          const rowId = rowIdByBusinessId.get(id);
          if (!rowId) throw new Error(`菜单 ${id} 缺少持久化标识`);
          return {
            id: rowId,
            parent: parent ? (rowIdByBusinessId.get(parent) ?? null) : null,
            power,
            type,
            categoryId: type === MenuType.CATEGORY ? id : null,
            pageId: type === MenuType.PAGE ? id : null,
            customId: type === MenuType.CUSTOM ? id : null,
          };
        });
        // Parent rows must precede children when one atomic insert becomes chunks.
        const byParent = new Map<string | null, typeof rows>();
        for (const row of rows) {
          const siblings = byParent.get(row.parent);
          if (siblings) siblings.push(row);
          else byParent.set(row.parent, [row]);
        }
        const ordered = [...(byParent.get(null) ?? [])];
        for (let index = 0; index < ordered.length; index++) {
          const row = ordered[index];
          if (row) ordered.push(...(byParent.get(row.id) ?? []));
        }
        for (
          let offset = 0;
          offset < ordered.length;
          offset += menuInsertChunkSize
        ) {
          await tx
            .insert(schema.menu)
            .values(ordered.slice(offset, offset + menuInsertChunkSize))
            .returning({ id: schema.menu.id });
        }
        return { count: rows.length, version: revision.version };
      }),
  );
  const publicSync = await invalidator
    .invalidate({
      refreshLayout: true,
      refreshSitemap: true,
    })
    .catch(() => ({ state: "degraded" as const }));
  return { ...persisted, publicSync: publicSync.state };
}
