import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";
import { MenuType } from "@/packages/domain/navigation/menu";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { PageStatus } from "@/packages/domain/content/page";
import { ResourceVisibility } from "@/packages/trpc/api/types/resource-visibility";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

export async function getMenuList(
  db: Database,
  visibility = ResourceVisibility.PUBLIC_ONLY,
) {
  const menus = await observeDbOperation("menu.service.list", "select", () =>
    db.query.menu.findMany({ orderBy: [asc(schema.menu.power)] }),
  );
  const categoryIds = menus
    .filter((menu) => menu.type === MenuType.CATEGORY && menu.categoryId)
    .map((menu) => menu.categoryId as string);
  const pageIds = menus
    .filter((menu) => menu.type === MenuType.PAGE && menu.pageId)
    .map((menu) => menu.pageId as string);

  const [categories, pages] = await Promise.all([
    categoryIds.length
      ? observeDbOperation("menu.service.categories", "select", () =>
          db
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
            ),
        )
      : Promise.resolve([]),
    pageIds.length
      ? observeDbOperation("menu.service.pages", "select", () =>
          db
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

/** 覆盖式保存完整菜单结构。 */
export async function saveAllMenus(
  db: Database,
  input: Array<{
    id: string;
    type: MenuType;
    parent?: string | null;
    power: number;
  }>,
) {
  return observeDbOperation("menu.save-all", "transaction", () =>
    db.transaction(async (tx) => {
      await tx.delete(schema.menu);
      if (!input.length) return { count: 0 };
      const rowIdByBusinessId = new Map(
        input.map((item) => [item.id, crypto.randomUUID()]),
      );
      const rows = await tx
        .insert(schema.menu)
        .values(
          input.map(({ id, type, parent, power }) => ({
            id: rowIdByBusinessId.get(id)!,
            parent: parent ? (rowIdByBusinessId.get(parent) ?? null) : null,
            power,
            type,
            categoryId: type === MenuType.CATEGORY ? id : null,
            pageId: type === MenuType.PAGE ? id : null,
            customId: type === MenuType.CUSTOM ? id : null,
          })),
        )
        .returning();
      return { count: rows.length };
    }),
  );
}
