/**
 * 将一个扁平的数组（通常是分类列表）转换为具有层级关系的树状结构。
 *
 * @param arr - 包含 `id` 和 `parent` 字段的原始扁平数组。
 * @param id - 起始的父节点 ID。如果为 `undefined`，则从根节点（`parent` 为 `null`）开始。
 * @returns 返回一个根据父子关系排序后的新数组，并为每个节点添加了 `deepPath` 属性表示其深度。
 */
export function flattenCategoryHierarchy<
  T extends { id: string; parent: string | null },
>(arr: T[], id?: string): (Omit<T, "deepPath"> & { deepPath: number })[] {
  const temp: (Omit<T, "deepPath"> & { deepPath: number })[] = [];
  const childrenByParent = Map.groupBy(arr, (value) =>
    value.parent?.toString(),
  );
  const visit = (parent: string | undefined, depth: number): void => {
    for (const value of childrenByParent.get(parent) ?? []) {
      temp.push(Object.assign(value, { deepPath: depth }));
      visit(value.id, depth + 1);
    }
  };
  visit(id, 0);
  return temp;
}
