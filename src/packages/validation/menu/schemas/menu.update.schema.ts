import { z } from "zod";
import { IdSchema } from "../../schemas/fields/id.schema";
import { TypeSchema } from "./fields/type.schema";
import { PowerSchema } from "./fields/power.schema";

/**
 * 批量更新菜单结构的数据验证 schema。
 *
 * 该 schema 定义了一个菜单项对象的数组结构。这用于一次性接收并处理整个菜单的更新，
 * 包括排序（通过 'power'）、层级关系（通过 'parent'）等。
 *
 * 每个菜单项对象包含以下字段：
 * - id: 菜单项的唯一标识符。
 * - type: 菜单项的类型（复用自 TypeSchema）。
 * - power: 菜单项的排序权重（复用自 PowerSchema）。
 * - parent: 父级菜单项的 ID，可选，用于构建层级关系。
 */
export const MenuUpdateSchema = z
  .object({
    id: IdSchema,
    type: TypeSchema,
    power: PowerSchema,
    parent: IdSchema.optional(),
  })
  .array();
