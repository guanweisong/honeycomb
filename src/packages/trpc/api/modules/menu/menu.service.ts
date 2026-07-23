import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import type { MultiLang } from "@/packages/trpc/api/types/multi.lang";
import { MenuType } from "./types/menu.type";
import { EnableStatus } from "@/packages/trpc/api/types/enable.status";
import { PageStatus } from "@/packages/trpc/api/modules/page/types/page.status";
import { ResourceVisibility } from "@/packages/trpc/api/types/resource-visibility";

export async function getMenuList(
  db: Database,
  visibility = ResourceVisibility.PUBLIC_ONLY,
) {
  const menus = await db.query.menu.findMany({
    orderBy: [asc(schema.menu.power)],
  });
  const categoryIds = menus
    .filter((menu) => menu.type === MenuType.CATEGORY && menu.categoryId)
    .map((menu) => menu.categoryId as string);
  const pageIds = menus
    .filter((menu) => menu.type === MenuType.PAGE && menu.pageId)
    .map((menu) => menu.pageId as string);

  const [categories, pages] = await Promise.all([
    categoryIds.length
      ? db
          .select({
            id: schema.category.id,
            title: schema.category.title,
            path: schema.category.path,
          })
          .from(schema.category)
          .where(
            visibility === ResourceVisibility.ALL
              ? inArray(schema.category.id, categoryIds)
              : and(
                  inArray(schema.category.id, categoryIds),
                  eq(schema.category.status, EnableStatus.ENABLE),
                ),
          )
      : Promise.resolve([]),
    pageIds.length
      ? db
          .select({
            id: schema.page.id,
            title: schema.page.title,
          })
          .from(schema.page)
          .where(
            visibility === ResourceVisibility.ALL
              ? inArray(schema.page.id, pageIds)
              : and(
                  inArray(schema.page.id, pageIds),
                  eq(schema.page.status, PageStatus.PUBLISHED),
                ),
          )
      : Promise.resolve([]),
  ]);

  const categoryMap = new Map(categories.map((item) => [item.id, item]));
  const pageMap = new Map(pages.map((item) => [item.id, item]));
  const visibleRowIds = new Set(
    menus
      .filter(
        (menu) =>
          visibility === ResourceVisibility.ALL ||
          menu.type === MenuType.CUSTOM ||
          (menu.type === MenuType.CATEGORY &&
            Boolean(menu.categoryId && categoryMap.has(menu.categoryId))) ||
          (menu.type === MenuType.PAGE &&
            Boolean(menu.pageId && pageMap.has(menu.pageId))),
      )
      .map((menu) => menu.id),
  );

  if (visibility === ResourceVisibility.PUBLIC_ONLY) {
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
      title = category?.title;
      path = category?.path;
    } else if (menu.type === MenuType.PAGE) {
      const page = menu.pageId ? pageMap.get(menu.pageId) : null;
      id = menu.pageId ?? menu.id;
      title = page?.title;
    } else if (menu.type === MenuType.CUSTOM) {
      id = menu.customId ?? menu.id;
    }

    return {
      id,
      parent: menu.parent
        ? (businessIdByRowId.get(menu.parent) ?? null)
        : null,
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
