import getCurrentPathOfMenu from "@/app/(blog)/lib/get-current-path-of-menu";
import type { MenuNavigationItem } from "@/app/(blog)/types/menu-navigation-item";
import { isCategoryPathSegment } from "@/features/category/rules/category-path";

function categoryRouteSegment({ path, id }: MenuNavigationItem) {
  if (path == null) return path;
  return isCategoryPathSegment(path) ? path : `~${encodeURIComponent(id)}`;
}

/** 历史异常路径以稳定的分类 ID 寻址，保留存储值和现有层级。 */
export function getCategoryRouteSegments(
  input: Omit<Parameters<typeof getCurrentPathOfMenu>[0], "pathOf">,
) {
  return getCurrentPathOfMenu({
    ...input,
    pathOf: categoryRouteSegment,
  });
}

export function getCategoryHref(segments: readonly string[] = []) {
  return ["", "list", "category", ...segments.map(encodeURIComponent)].join(
    "/",
  );
}

export function findCategoryRouteItem(
  menu: MenuNavigationItem[],
  segments: readonly string[],
) {
  const tail = segments.at(-1);
  if (tail === undefined) return undefined;
  return menu.find((item) => {
    if (categoryRouteSegment(item) !== tail) return false;
    const expected = getCategoryRouteSegments({ id: item.id, menu });
    return (
      expected.length === segments.length &&
      expected.every((part, index) => part === segments[index])
    );
  });
}
