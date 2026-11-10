import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { parseEnumValue } from "@/lib/db/value-validation";
import { EnableStatus } from "@/lib/validation/enable-status";
import { PageStatus } from "@/features/page/types/page.status";
import { observeDbOperation } from "@/lib/observability/server";
import { assembleRequiredLocalizedField } from "@/lib/db/translation-values";
import { ApplicationError } from "@/lib/errors/application-error";
import { MenuType } from "@/features/menu/types/menu.type";
import type { MenuItem } from "@/features/menu/types/menu.list";

const menuRelations = {
  category: {
    columns: { path: true, status: true },
    with: { translations: { columns: { locale: true, title: true } } },
  },
  page: {
    columns: { status: true },
    with: { translations: { columns: { locale: true, title: true } } },
  },
} as const;

type MenuRow = Awaited<ReturnType<typeof selectMenuRows>>[number];

function parseMenuType(row: MenuRow) {
  return {
    ...row,
    type: parseEnumValue(row.type, Object.values(MenuType), "menu.type"),
  };
}

function selectMenuRows(db: Pick<Database, "query">) {
  return db.query.menu.findMany({
    orderBy: [asc(schema.menu.power)],
    with: menuRelations,
  });
}

function toMenuList(menus: ReturnType<typeof parseMenuType>[]): MenuItem[] {
  const businessIdByRowId = new Map(
    menus.map((menu) => [
      menu.id,
      menu.type === MenuType.CATEGORY
        ? menu.categoryId
        : menu.type === MenuType.PAGE
          ? menu.pageId
          : menu.customId,
    ]),
  );
  return menus.map((menu) => {
    const target = menu.type === MenuType.CATEGORY ? menu.category : menu.page;
    return {
      id: businessIdByRowId.get(menu.id) ?? menu.id,
      parent: menu.parent ? (businessIdByRowId.get(menu.parent) ?? null) : null,
      power: menu.power,
      type: menu.type,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
      title:
        menu.type === MenuType.CUSTOM
          ? undefined
          : target
            ? assembleRequiredLocalizedField(
                target.translations,
                (row) => row.title,
              )
            : null,
      path: menu.type === MenuType.CATEGORY ? menu.category?.path : null,
    };
  });
}

export async function listMenus(db: Pick<Database, "query">) {
  const rows = await observeDbOperation("menu.service.list", "select", () =>
    selectMenuRows(db),
  );
  const menus = rows.map(parseMenuType);
  const visibleRowIds = new Set<string>();
  for (const menu of menus) {
    const { type } = menu;
    if (
      type === MenuType.CUSTOM ||
      (type === MenuType.CATEGORY &&
        menu.category?.status === EnableStatus.ENABLE) ||
      (type === MenuType.PAGE && menu.page?.status === PageStatus.PUBLISHED)
    ) {
      visibleRowIds.add(menu.id);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const menu of menus) {
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
  const list = toMenuList(menus.filter((menu) => visibleRowIds.has(menu.id)));
  return { list, total: list.length };
}

/** A fixed atomic batch keeps the revision and tree in one snapshot without
 * holding an interactive write transaction across JavaScript awaits. */
export async function getMenuSnapshot(db: Database) {
  const [[revision], rows] = await observeDbOperation(
    "menu.service.list",
    "select",
    () =>
      db.batch([
        db
          .select({ version: schema.menuRevision.version })
          .from(schema.menuRevision)
          .where(eq(schema.menuRevision.singletonKey, 1))
          .limit(1),
        selectMenuRows(db),
      ]),
  );
  if (!revision)
    throw new ApplicationError("INTERNAL_SERVER_ERROR", "菜单版本尚未初始化");

  const list = toMenuList(rows.map(parseMenuType));
  return { list, total: list.length, version: revision.version };
}
