import "server-only";
import { parseEnumValue } from "@/packages/infrastructure/db/value-validation";

import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";
import { MenuType } from "@/packages/domain/navigation/menu";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { PageStatus } from "@/packages/domain/content/page";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { assembleRequiredLocalizedField } from "@/packages/infrastructure/db/translation-values";

import type { MenuRepository } from "../application/repository";
export type { MenuInput, MenuRepository, MenuVisibility } from "../application/repository";

export function createMenuRepository(db: Database): MenuRepository {
  return {
    saveAll(input) {
      return observeDbOperation("menu.save-all", "transaction", () => db.transaction(async (tx) => {
        await tx.delete(schema.menu);
        if (!input.length) return { count: 0 };
        const rowIdByBusinessId = new Map(input.map((item) => [item.id, crypto.randomUUID()]));
        const rows = await tx.insert(schema.menu).values(input.map(({ id, type, parent, power }) => {
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
        })).returning();
        return { count: rows.length };
      }));
    },
    async list(visibility) {
      const rows = await observeDbOperation("menu.service.list", "select", () => db.query.menu.findMany({ orderBy: [asc(schema.menu.power)] }));
      const menus = rows.map((menu) => ({ ...menu, type: parseEnumValue(menu.type, Object.values(MenuType), "menu.type") }));
      const categoryIds = menus.map((menu) => menu.type === MenuType.CATEGORY ? menu.categoryId : null).filter((id): id is string => id !== null);
      const pageIds = menus.map((menu) => menu.type === MenuType.PAGE ? menu.pageId : null).filter((id): id is string => id !== null);
      const [categories, pages] = await Promise.all([
        categoryIds.length ? observeDbOperation("menu.service.categories", "select", () => db.select({ id: schema.category.id, path: schema.category.path }).from(schema.category).where(visibility === "ALL" ? inArray(schema.category.id, categoryIds) : and(inArray(schema.category.id, categoryIds), eq(schema.category.status, EnableStatus.ENABLE)))) : Promise.resolve([]),
        pageIds.length ? observeDbOperation("menu.service.pages", "select", () => db.select({ id: schema.page.id }).from(schema.page).where(visibility === "ALL" ? inArray(schema.page.id, pageIds) : and(inArray(schema.page.id, pageIds), eq(schema.page.status, PageStatus.PUBLISHED)))) : Promise.resolve([]),
      ]);
      const [categoryTranslations, pageTranslations] = await Promise.all([
        categories.length ? db.select().from(schema.categoryTranslation).where(inArray(schema.categoryTranslation.categoryId, categories.map(({ id }) => id))) : Promise.resolve([]),
        pages.length ? db.select().from(schema.pageTranslation).where(inArray(schema.pageTranslation.pageId, pages.map(({ id }) => id))) : Promise.resolve([]),
      ]);
      const categoryMap = new Map(categories.map((item) => [item.id, { ...item, translations: categoryTranslations.filter((row) => row.categoryId === item.id) }]));
      const pageMap = new Map(pages.map((item) => [item.id, { ...item, translations: pageTranslations.filter((row) => row.pageId === item.id) }]));
      const visibleRowIds = new Set(menus.filter((menu) => visibility === "ALL" || menu.type === MenuType.CUSTOM || (menu.type === MenuType.CATEGORY && Boolean(menu.categoryId && categoryMap.has(menu.categoryId))) || (menu.type === MenuType.PAGE && Boolean(menu.pageId && pageMap.has(menu.pageId)))).map((menu) => menu.id));
      if (visibility === "PUBLIC_ONLY") {
        let changed = true;
        while (changed) {
          changed = false;
          for (const menu of menus) if (visibleRowIds.has(menu.id) && menu.parent && !visibleRowIds.has(menu.parent)) { visibleRowIds.delete(menu.id); changed = true; }
        }
      }
      const visibleMenus = menus.filter((menu) => visibleRowIds.has(menu.id));
      const businessIdByRowId = new Map(visibleMenus.map((menu) => [menu.id, menu.type === MenuType.CATEGORY ? menu.categoryId : menu.type === MenuType.PAGE ? menu.pageId : menu.customId]));
      const list = visibleMenus.map((menu) => {
        let title: MultiLang | undefined | null;
        let path: string | null | undefined = null;
        let id: string | null | undefined = menu.id;
        if (menu.type === MenuType.CATEGORY) { const category = menu.categoryId ? categoryMap.get(menu.categoryId) : null; id = menu.categoryId ?? menu.id; title = category ? assembleRequiredLocalizedField(category.translations, (row) => row.title) : null; path = category?.path; }
        else if (menu.type === MenuType.PAGE) { const page = menu.pageId ? pageMap.get(menu.pageId) : null; id = menu.pageId ?? menu.id; title = page ? assembleRequiredLocalizedField(page.translations, (row) => row.title) : null; }
        else if (menu.type === MenuType.CUSTOM) id = menu.customId ?? menu.id;
        return { id: id ?? menu.id, parent: menu.parent ? (businessIdByRowId.get(menu.parent) ?? null) : null, power: menu.power, type: menu.type, createdAt: menu.createdAt, updatedAt: menu.updatedAt, title, path };
      });
      return { list, total: list.length };
    },
  };
}
