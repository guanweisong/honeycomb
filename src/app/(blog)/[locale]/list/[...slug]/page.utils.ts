import {
  findCategoryRouteItem,
  getCategoryHref,
  getCategoryRouteSegments,
} from "@/app/(blog)/lib/category-route";
import getCurrentPathOfMenu from "@/app/(blog)/lib/get-current-path-of-menu";
import {
  getPublicAuthor,
  getPublicMenu,
  getPublicTag,
} from "@/app/lib/server/public-queries";
import type { MultiLangEnum } from "@/lib/i18n/i18n";
import { PostStatus } from "@/features/post/types/post.status";
import type { PostListQueryInput } from "@/features/post/types/post.list-query";
import { IdSchema } from "@/lib/validation/id.schema";
import { notFound, redirect } from "next/navigation";

const PAGE_SIZE = 10;

type ListContextInput = {
  locale: MultiLangEnum;
  slug?: string[];
};

/** 将动态列表路径解析为唯一的查询条件和本地化标题上下文。 */
export async function resolveListContext({
  locale,
  slug = [],
}: ListContextInput) {
  const type = slug[0];
  if (type !== "category" && type !== "tags" && type !== "authors") {
    notFound();
  }
  const typeValue = slug.at(-1) ?? "";
  if (
    (type === "tags" || type === "authors") &&
    (slug.length !== 2 || !IdSchema.safeParse(typeValue).success)
  ) {
    notFound();
  }
  let typeName = typeValue;
  let queryParams: PostListQueryInput = {
    status: [PostStatus.PUBLISHED],
    limit: PAGE_SIZE,
    sortField: "createdAt",
  };

  switch (type) {
    case "category": {
      const paths = slug.slice(1);
      if (paths.length === 0) {
        typeName = "";
        break;
      }
      if (paths.some((path) => !path)) notFound();
      const items = (await getPublicMenu()).list;
      const matches = (expected: string[]) =>
        expected.length === paths.length &&
        expected.every((path, index) => path === paths[index]);
      const category = findCategoryRouteItem(items, paths);
      if (!category) {
        const legacy = items.find(
          (item) =>
            item.path === typeValue &&
            matches(getCurrentPathOfMenu({ id: item.id, menu: items })),
        );
        if (!legacy) notFound();
        redirect(
          `/${locale}${getCategoryHref(getCategoryRouteSegments({ id: legacy.id, menu: items }))}`,
        );
      }
      queryParams = { ...queryParams, categoryId: category.id };
      typeName = category.title?.[locale] ?? "";
      break;
    }
    case "tags": {
      const matchedTag = await getPublicTag(typeValue);
      if (!matchedTag) notFound();
      queryParams = {
        ...queryParams,
        tagId: matchedTag.id,
      };
      typeName = matchedTag.name?.[locale] ?? "";
      break;
    }
    case "authors": {
      const matchedAuthor = await getPublicAuthor(typeValue);
      if (!matchedAuthor) notFound();
      queryParams = {
        ...queryParams,
        authorId: matchedAuthor.id,
      };
      typeName = matchedAuthor.name ?? "";
      break;
    }
  }

  return { queryParams, type, typeName };
}

type ListTitleInput = {
  authorTitle: (author: string) => string;
  siteName?: string | null;
  tagTitle: (tag: string) => string;
  type?: string;
  typeName: string;
};

/** 页面标题与 metadata 共用同一套列表标题回退规则。 */
export function resolveListTitle({
  authorTitle,
  siteName,
  tagTitle,
  type,
  typeName,
}: ListTitleInput) {
  if (type === "tags") return tagTitle(typeName);
  if (type === "authors") return authorTitle(typeName);
  return typeName ? `${typeName}_${siteName ?? ""}` : (siteName ?? "");
}
