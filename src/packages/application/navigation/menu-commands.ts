import "server-only";

import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { MenuType } from "@/packages/domain/navigation/menu";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

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
