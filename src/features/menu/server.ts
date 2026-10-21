import "server-only";
import { SQL_ID_CHUNK_SIZE } from "@/lib/db/query/parameter-limits";
import {
  transactionWithBeginRetry,
  type DatabaseTransaction,
} from "@/lib/db/transaction-begin-retry";
import { parseEnumValue } from "@/lib/db/value-validation";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import type { MultiLang } from "@/lib/i18n/multi-lang";
import { MenuType } from "@/features/menu/menu-types";
import { EnableStatus } from "@/lib/validation/enable-status";
import { PageStatus } from "@/features/page/page-status";
import { observeDbOperation } from "@/lib/observability/server";
import { assembleRequiredLocalizedField } from "@/lib/db/translation-values";
import type { MenuInput, MenuVisibility } from "./types";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";

import { MenuSaveSnapshotSchema, type MenuSaveSnapshot } from "./schema";
import { can, Permission } from "@/lib/auth/permissions";
import { UserStatus } from "@/features/user/user";

import { ApplicationError } from "@/lib/errors/application-error";

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
          const targets = await tx
            .select({ id: target.id })
            .from(target)
            .where(inArray(target.id, ids));
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
        const rows = await tx
          .insert(schema.menu)
          .values(
            input.map(({ id, type, parent, power }) => {
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
            }),
          )
          .returning();
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

export async function listMenus(
  db: Pick<Database, "select" | "query">,
  visibility: MenuVisibility,
) {
  const rows = await observeDbOperation("menu.service.list", "select", () =>
    db.query.menu.findMany({ orderBy: [asc(schema.menu.power)] }),
  );
  const menus = rows.map((menu) => ({
    ...menu,
    type: parseEnumValue(menu.type, Object.values(MenuType), "menu.type"),
  }));
  const categoryIds = menus
    .map((menu) => (menu.type === MenuType.CATEGORY ? menu.categoryId : null))
    .filter((id): id is string => id !== null);
  const pageIds = menus
    .map((menu) => (menu.type === MenuType.PAGE ? menu.pageId : null))
    .filter((id): id is string => id !== null);
  const [categories, pages] = await Promise.all([
    categoryIds.length
      ? observeDbOperation("menu.service.categories", "select", () =>
          db
            .select({ id: schema.category.id, path: schema.category.path })
            .from(schema.category)
            .where(
              visibility === "ALL"
                ? inArray(schema.category.id, categoryIds)
                : and(
                    inArray(schema.category.id, categoryIds),
                    eq(schema.category.status, EnableStatus.ENABLE),
                  ),
            ),
        )
      : Promise.resolve([]),
    pageIds.length
      ? observeDbOperation("menu.service.pages", "select", () =>
          db
            .select({ id: schema.page.id })
            .from(schema.page)
            .where(
              visibility === "ALL"
                ? inArray(schema.page.id, pageIds)
                : and(
                    inArray(schema.page.id, pageIds),
                    eq(schema.page.status, PageStatus.PUBLISHED),
                  ),
            ),
        )
      : Promise.resolve([]),
  ]);
  const [categoryTranslations, pageTranslations] = await Promise.all([
    categories.length
      ? db
          .select({
            categoryId: schema.categoryTranslation.categoryId,
            locale: schema.categoryTranslation.locale,
            title: schema.categoryTranslation.title,
          })
          .from(schema.categoryTranslation)
          .where(
            inArray(
              schema.categoryTranslation.categoryId,
              categories.map(({ id }) => id),
            ),
          )
      : Promise.resolve([]),
    pages.length
      ? db
          .select({
            pageId: schema.pageTranslation.pageId,
            locale: schema.pageTranslation.locale,
            title: schema.pageTranslation.title,
          })
          .from(schema.pageTranslation)
          .where(
            inArray(
              schema.pageTranslation.pageId,
              pages.map(({ id }) => id),
            ),
          )
      : Promise.resolve([]),
  ]);
  const categoryMap = new Map(
    categories.map((item) => [
      item.id,
      {
        ...item,
        translations: categoryTranslations.filter(
          (row) => row.categoryId === item.id,
        ),
      },
    ]),
  );
  const pageMap = new Map(
    pages.map((item) => [
      item.id,
      {
        ...item,
        translations: pageTranslations.filter((row) => row.pageId === item.id),
      },
    ]),
  );
  const visibleRowIds = new Set(
    menus
      .filter(
        (menu) =>
          visibility === "ALL" ||
          menu.type === MenuType.CUSTOM ||
          (menu.type === MenuType.CATEGORY &&
            Boolean(menu.categoryId && categoryMap.has(menu.categoryId))) ||
          (menu.type === MenuType.PAGE &&
            Boolean(menu.pageId && pageMap.has(menu.pageId))),
      )
      .map((menu) => menu.id),
  );
  if (visibility === "PUBLIC_ONLY") {
    let changed = true;
    while (changed) {
      changed = false;
      for (const menu of menus)
        if (
          visibleRowIds.has(menu.id) &&
          menu.parent &&
          !visibleRowIds.has(menu.parent)
        ) {
          visibleRowIds.delete(menu.id);
          changed = true;
        }
    }
  }
  const visibleMenus = menus.filter((menu) => visibleRowIds.has(menu.id));
  const businessIdByRowId = new Map(
    visibleMenus.map((menu) => [
      menu.id,
      menu.type === MenuType.CATEGORY
        ? menu.categoryId
        : menu.type === MenuType.PAGE
          ? menu.pageId
          : menu.customId,
    ]),
  );
  const list = visibleMenus.map((menu) => {
    let title: MultiLang | undefined | null;
    let path: string | null | undefined = null;
    let id: string | null | undefined = menu.id;
    if (menu.type === MenuType.CATEGORY) {
      const category = menu.categoryId
        ? categoryMap.get(menu.categoryId)
        : null;
      id = menu.categoryId ?? menu.id;
      title = category
        ? assembleRequiredLocalizedField(
            category.translations,
            (row) => row.title,
          )
        : null;
      path = category?.path;
    } else if (menu.type === MenuType.PAGE) {
      const page = menu.pageId ? pageMap.get(menu.pageId) : null;
      id = menu.pageId ?? menu.id;
      title = page
        ? assembleRequiredLocalizedField(page.translations, (row) => row.title)
        : null;
    } else if (menu.type === MenuType.CUSTOM) id = menu.customId ?? menu.id;
    return {
      id: id ?? menu.id,
      parent: menu.parent ? (businessIdByRowId.get(menu.parent) ?? null) : null,
      power: menu.power,
      type: menu.type,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
      title,
      path,
    };
  });
  return { list, total: list.length };
}

/** Read the revision and full editable tree from one database snapshot. */
export async function getMenuSnapshot(db: Database) {
  return db.transaction(async (tx) => {
    const [revision] = await tx
      .select()
      .from(schema.menuRevision)
      .where(eq(schema.menuRevision.singletonKey, 1))
      .limit(1);
    if (!revision)
      throw new ApplicationError("INTERNAL_SERVER_ERROR", "菜单版本尚未初始化");
    return { ...(await listMenus(tx, "ALL")), version: revision.version };
  });
}

async function bumpMenuRevisionForTargets(
  tx: DatabaseTransaction,
  field: typeof schema.menu.pageId | typeof schema.menu.categoryId,
  ids: string[],
) {
  let hasReference = false;
  for (let offset = 0; offset < ids.length; offset += SQL_ID_CHUNK_SIZE) {
    const [affected] = await tx
      .select({ id: schema.menu.id })
      .from(schema.menu)
      .where(inArray(field, ids.slice(offset, offset + SQL_ID_CHUNK_SIZE)))
      .limit(1);
    if (affected) {
      hasReference = true;
      break;
    }
  }
  if (!hasReference) return;
  const [revision] = await tx
    .update(schema.menuRevision)
    .set({ version: sql`${schema.menuRevision.version} + 1` })
    .where(eq(schema.menuRevision.singletonKey, 1))
    .returning({ version: schema.menuRevision.version });
  if (!revision)
    throw new ApplicationError("INTERNAL_SERVER_ERROR", "菜单版本尚未初始化");
}
export async function bumpMenuRevisionForPageDeletion(
  tx: DatabaseTransaction,
  ids: string[],
) {
  await bumpMenuRevisionForTargets(tx, schema.menu.pageId, ids);
}
export async function bumpMenuRevisionForCategoryDeletion(
  tx: DatabaseTransaction,
  ids: string[],
) {
  await bumpMenuRevisionForTargets(tx, schema.menu.categoryId, ids);
}
