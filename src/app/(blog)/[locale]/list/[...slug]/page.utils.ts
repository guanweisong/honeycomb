import {
  findCategoryRouteItem,
  getCategoryHref,
  getCategoryRouteSegments,
} from "@/app/(blog)/lib/category-route";
import getCurrentPathOfMenu from "@/app/(blog)/lib/get-current-path-of-menu";
import type { createServerClient } from "@/app/trpc/server";
import type { MultiLangEnum } from "@/lib/i18n/i18n";
import { PostStatus } from "@/features/post/types/post.status";
import type { PostListQueryInput } from "@/features/post/types/post.list-query";
import { IdSchema } from "@/lib/validation/id.schema";

const PAGE_SIZE = 10;

type ListContextInput = {
  locale: MultiLangEnum;
  slug?: string[];
};

type ListContextCaller = Awaited<ReturnType<typeof createServerClient>>;

export type ListContextResolution =
  | { kind: "not-found" }
  | { kind: "redirect"; href: string }
  | {
      kind: "resolved";
      context: {
        queryParams: PostListQueryInput;
        type: string;
        typeName: string;
      };
    };

/** 在访问 tRPC 或数据库前拒绝结构无效的列表 URL。 */
export function isValidListRoute(slug: string[] = []) {
  const [type] = slug;
  if (type !== "category" && type !== "tags" && type !== "authors")
    return false;
  if (type === "category") return slug.slice(1).every(Boolean);
  return slug.length === 2 && IdSchema.safeParse(slug.at(-1)).success;
}

/** 将动态列表路径解析为唯一的查询条件和本地化标题上下文。 */
export async function resolveListContext(
  { locale, slug = [] }: ListContextInput,
  caller: ListContextCaller,
): Promise<ListContextResolution> {
  const type = slug[0];
  if (
    !isValidListRoute(slug) ||
    (type !== "category" && type !== "tags" && type !== "authors")
  )
    return { kind: "not-found" };
  const typeValue = slug.at(-1) ?? "";
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
      const items = (await caller.menu.index()).list;
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
        if (!legacy) return { kind: "not-found" };
        return {
          kind: "redirect",
          href: `/${locale}${getCategoryHref(getCategoryRouteSegments({ id: legacy.id, menu: items }))}`,
        };
      }
      queryParams = { ...queryParams, categoryId: category.id };
      typeName = category.title?.[locale] ?? "";
      break;
    }
    case "tags": {
      const matchedTag = (
        await caller.tag.index({ limit: 1, page: 1, id: [typeValue] })
      ).list[0];
      if (!matchedTag) return { kind: "not-found" };
      queryParams = {
        ...queryParams,
        tagId: matchedTag.id,
      };
      typeName = matchedTag.name?.[locale] ?? "";
      break;
    }
    case "authors": {
      const matchedAuthor = await caller.user.detail({ id: typeValue });
      if (!matchedAuthor) return { kind: "not-found" };
      queryParams = {
        ...queryParams,
        authorId: matchedAuthor.id,
      };
      typeName = matchedAuthor.name ?? "";
      break;
    }
  }

  return { kind: "resolved", context: { queryParams, type, typeName } };
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
