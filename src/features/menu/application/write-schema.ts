import { z } from "zod";
import { MenuType } from "@/packages/domain/navigation/menu";
import { IdSchema } from "@/packages/domain/shared/id.schema";

export const MenuTypeSchema = z.enum(MenuType).default(MenuType.CATEGORY);
export const MenuPowerSchema = z.number().int();

/** 覆盖式保存完整菜单结构的唯一写入契约。 */
export const MenuWriteSchema = z
  .object({
    id: IdSchema,
    type: MenuTypeSchema,
    power: MenuPowerSchema,
    parent: IdSchema.nullable().optional(),
  })
  .array()
  .min(1, "菜单不能为空");

export type MenuInput = z.output<typeof MenuWriteSchema>;
