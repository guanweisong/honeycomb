/**
 * 通用工具类
 */
class Tools {
  /**
   * 将一个扁平的数组（通常是分类列表）转换为具有层级关系的树状结构。
   *
   * @param {any[]} arr - 包含 `id` 和 `parent` 字段的原始扁平数组。
   * @param {string} id - 起始的父节点 ID。如果为 `undefined`，则从根节点（`parent` 为 `null`）开始。
   * @returns {any[]} 返回一个根据父子关系排序后的新数组，并为每个节点添加了 `deepPath` 属性表示其深度。
   */
  static sonsTree(arr: any, id: string) {
    const temp: any[] = [];
    let lev = 0;
    const forFn = (arr: any, id: string, lev: number) => {
      for (const value of arr) {
        if (
          (value.parent === null && id === undefined) ||
          value.parent?.toString() === id
        ) {
          value.deepPath = lev;
          temp.push(value);
          forFn(arr, value.id, lev + 1);
        }
      }
    };
    forFn(arr, id, lev);
    return temp;
  }
}

// ===== Drizzle Helpers =====
import { and, inArray, like, SQL, sql } from "drizzle-orm";

/**
 * 动态构建 Drizzle ORM 的 WHERE 查询子句。
 * 根据传入的查询参数，智能地生成 `AND` 连接的 SQL 条件。
 *
 * @template T - Drizzle 的表 schema 类型。
 * @param {T} table - Drizzle 的表 schema 对象。
 * @param {any} queries - 包含简单键值对的查询对象。键对应表字段，值对应查询值。
 * @param {string[]} queryArray - 一个字符串数组，指定哪些 `queries` 中的键应该使用 `IN` 查询（精确匹配数组中的任何一个值）。
 * @param {any} [multiLangQueries] - （可选）用于多语言字段模糊查询的键值对对象。
 * @returns {SQL | undefined} 返回一个 Drizzle 的 SQL 条件对象，如果没有有效的查询条件则返回 `undefined`。
 *
 * 工作流程：
 * 1. 遍历 `queries` 对象，对每个非空值：
 *    - 如果键存在于 `queryArray` 中，则构建一个 `inArray(column, value)` 子句。
 *    - 否则，构建一个 `like(column, %value%)` 的模糊查询子句。
 * 2. 遍历 `multiLangQueries` 对象，为每个非空值构建一个 `like(column, %value%)` 子句。
 * 3. 将所有生成的子句用 `and()` 连接起来返回。
 */
export function buildDrizzleWhere<T extends Record<string, any>>(
  table: T,
  queries: any,
  queryArray: string[],
  multiLangQueries?: any,
): SQL | undefined {
  const clauses: SQL[] = [] as unknown as SQL[];

  // 处理普通查询和 IN 查询
  for (const key in queries) {
    const value = queries[key];
    if (typeof value === "undefined") continue;
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (value === "" || isEmptyArray) continue;

    const col = (table as any)[key];
    if (!col) continue;

    if (queryArray.includes(key)) {
      // 精确匹配数组中的值 (IN)
      clauses.push(inArray(col, Array.isArray(value) ? value : [value]));
    } else {
      // 模糊搜索 (LIKE)
      clauses.push(like(col, `%${value}%`));
    }
  }

  // 处理多语言字段的模糊查询
  if (multiLangQueries) {
    for (const k in multiLangQueries) {
      const v = multiLangQueries[k];
      if (typeof v === "undefined" || v === "") continue;
      const col = (table as any)[k];
      if (!col) continue;
      clauses.push(like(col, `%${v}%`));
    }
  }

  if (!clauses.length) return undefined;
  if (clauses.length === 1) return clauses[0] as unknown as SQL;
  return and(...(clauses as any));
}

/**
 * 构建 Drizzle ORM 的 ORDER BY 排序子句。
 *
 * @template T - Drizzle 的表 schema 类型。
 * @param {T} table - Drizzle 的表 schema 对象。
 * @param {string | undefined} sortField - 用于排序的字段名。
 * @param {"asc" | "desc"} [sortOrder="desc"] - 排序方向。
 * @param {keyof T} [defaultField="createdAt"] - 如果 `sortField` 无效或未提供，则使用的默认排序字段。
 * @returns {SQL} 返回一个 Drizzle 的 SQL 排序表达式。
 */
export function buildDrizzleOrderBy<T extends Record<string, any>>(
  table: T,
  sortField: string | undefined,
  sortOrder: "asc" | "desc" = "desc",
  defaultField: keyof T = "createdAt",
): SQL<unknown> {
  const direction = sortOrder.toLowerCase() === "asc" ? "asc" : "desc";
  const field =
    (sortField && table[sortField as keyof T]) || table[defaultField];

  if (!field) {
    throw new Error(`Invalid sort field: ${String(sortField)}`);
  }

  return sql`${field} ${sql.raw(direction)}`;
}

export default Tools;
