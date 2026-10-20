import { z } from "zod";

import { MenuType } from "@/features/menu/menu-types";

import { IdSchema } from "@/lib/validation/id.schema";

const MenuTypeSchema = z.enum(MenuType).default(MenuType.CATEGORY);
const MenuPowerSchema = z.number().int();

/** 覆盖式保存完整菜单结构的唯一写入契约。 */
export const MenuWriteSchema = z
  .strictObject({
    id: IdSchema,
    type: MenuTypeSchema,
    power: MenuPowerSchema,
    parent: IdSchema.nullable().optional(),
  })
  .array()
  .min(1, "菜单不能为空");

export type MenuInput = z.output<typeof MenuWriteSchema>;

export const MenuSaveSnapshotSchema = z.strictObject({
  expectedVersion: z.number().int().nonnegative(),
  items: MenuWriteSchema,
});
export type MenuSaveSnapshot = z.output<typeof MenuSaveSnapshotSchema>;
