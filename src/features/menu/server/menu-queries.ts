import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { SQL_ID_CHUNK_SIZE } from "@/lib/db/query/parameter-limits";
import { parseEnumValue } from "@/lib/db/value-validation";
import type { MultiLang } from "@/lib/i18n/multi-lang";
import { EnableStatus } from "@/lib/validation/enable-status";
import { PageStatus } from "@/features/page/types/page.status";
import { observeDbOperation } from "@/lib/observability/server";
import { assembleRequiredLocalizedField } from "@/lib/db/translation-values";
import { ApplicationError } from "@/lib/errors/application-error";
import { MenuType } from "../types/menu.type";
import type { MenuVisibility } from "../types/menu.list";

export async function readMenuChunks<Row>(
  ids: string[],
  read: (ids: string[]) => PromiseLike<Row[]>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; offset < ids.length; offset += SQL_ID_CHUNK_SIZE) {
    rows.push(...(await read(ids.slice(offset, offset + SQL_ID_CHUNK_SIZE))));
  }
  return rows;
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
          readMenuChunks(categoryIds, (chunk) =>
            db
              .select({ id: schema.category.id, path: schema.category.path })
              .from(schema.category)
              .where(
                visibility === "ALL"
                  ? inArray(schema.category.id, chunk)
                  : and(
                      inArray(schema.category.id, chunk),
                      eq(schema.category.status, EnableStatus.ENABLE),
                    ),
              ),
          ),
        )
      : Promise.resolve([]),
    pageIds.length
      ? observeDbOperation("menu.service.pages", "select", () =>
          readMenuChunks(pageIds, (chunk) =>
            db
              .select({ id: schema.page.id })
              .from(schema.page)
              .where(
                visibility === "ALL"
                  ? inArray(schema.page.id, chunk)
                  : and(
                      inArray(schema.page.id, chunk),
                      eq(schema.page.status, PageStatus.PUBLISHED),
                    ),
              ),
          ),
        )
      : Promise.resolve([]),
  ]);
  const [categoryTranslations, pageTranslations] = await Promise.all([
    categories.length
      ? readMenuChunks(
          categories.map(({ id }) => id),
          (chunk) =>
            db
              .select({
                categoryId: schema.categoryTranslation.categoryId,
                locale: schema.categoryTranslation.locale,
                title: schema.categoryTranslation.title,
              })
              .from(schema.categoryTranslation)
              .where(inArray(schema.categoryTranslation.categoryId, chunk)),
        )
      : Promise.resolve([]),
    pages.length
      ? readMenuChunks(
          pages.map(({ id }) => id),
          (chunk) =>
            db
              .select({
                pageId: schema.pageTranslation.pageId,
                locale: schema.pageTranslation.locale,
                title: schema.pageTranslation.title,
              })
              .from(schema.pageTranslation)
              .where(inArray(schema.pageTranslation.pageId, chunk)),
        )
      : Promise.resolve([]),
  ]);
  const categoryTranslationsById = Map.groupBy(
    categoryTranslations,
    (row) => row.categoryId,
  );
  const pageTranslationsById = Map.groupBy(
    pageTranslations,
    (row) => row.pageId,
  );
  const categoryMap = new Map(
    categories.map((item) => [
      item.id,
      { ...item, translations: categoryTranslationsById.get(item.id) ?? [] },
    ]),
  );
  const pageMap = new Map(
    pages.map((item) => [
      item.id,
      { ...item, translations: pageTranslationsById.get(item.id) ?? [] },
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
