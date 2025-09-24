class Tools {
  /**
   * 根据controller的queries参数拼接prisma的查询条件
   * @param {*} queries controller的参数
   * @param {*} queryArray 允许查询的参数名数组
   * @param {*} multiLangQueries controller的多语言参数
   * @return {*} conditions 拼接完成prisma的查询条件
   */
  static getFindConditionsByQueries(
    queries: any,
    queryArray: string[],
    multiLangQueries?: any,
  ) {
    const conditions = {} as any;
    for (const item in queries) {
      if (typeof queries[item] !== "undefined") {
        const isEmptyArray =
          Array.isArray(queries[item]) && queries[item].length === 0;
        if (
          queryArray.includes(item) &&
          queries[item] !== "" &&
          !isEmptyArray
        ) {
          conditions[item] = { in: queries[item] };
        } else if (
          !queryArray.includes(item) &&
          queries[item] !== "" &&
          !isEmptyArray
        ) {
          conditions[item] = { contains: queries[item] };
        }
      }
    }

    for (const item in multiLangQueries) {
      if (typeof multiLangQueries[item] !== "undefined") {
        const value = multiLangQueries[item];
        conditions["OR"] = [
          { [item]: { is: { zh: value } } },
          { [item]: { is: { en: value } } },
        ];
      }
    }

    console.log("conditions", conditions);
    return conditions;
  }

  /**
   * 子孙树，获取某个ID下的分类
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
import { and, inArray, like, or, SQL, sql } from "drizzle-orm";

export function buildDrizzleWhere<T extends Record<string, any>>(
  table: T,
  queries: any,
  queryArray: string[],
  multiLangQueries?: any,
): SQL | undefined {
  const clauses: SQL[] = [] as unknown as SQL[];

  // simple fields
  for (const key in queries) {
    const value = queries[key];
    if (typeof value === "undefined") continue;
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (value === "" || isEmptyArray) continue;

    const col = (table as any)[key];
    if (!col) continue;

    if (queryArray.includes(key)) {
      // exact enums/status filters: IN
      clauses.push(inArray(col, Array.isArray(value) ? value : [value]));
    } else {
      // fuzzy search via LIKE on stored text (includes JSON text columns)
      clauses.push(like(col, `%${value}%`));
    }
  }

  // multi-lang fuzzy OR
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
 * 构建 Drizzle 的排序条件
 * @param table 表对象
 * @param sortField 排序字段
 * @param sortOrder 排序方向 'asc' | 'desc'
 * @param defaultField 默认排序字段
 * @returns SQL 表达式
 */
export function buildDrizzleOrderBy<T extends Record<string, any>>(
  table: T,
  sortField: string | undefined,
  sortOrder: 'asc' | 'desc' = 'desc',
  defaultField: keyof T = 'createdAt'
): SQL<unknown> {
  const direction = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
  const field = (sortField && table[sortField as keyof T]) || table[defaultField];
  
  if (!field) {
    throw new Error(`Invalid sort field: ${String(sortField)}`);
  }
  
  return sql`${field} ${sql.raw(direction)}`;
}

export default Tools;
