import getCurrentPathOfMenu from "@/app/(blog)/lib/get-current-path-of-menu";
import {
  getPublicAuthor,
  getPublicMenu,
  getPublicTag,
} from "@/app/lib/server/public-queries";
import type { MultiLangEnum } from "@/lib/i18n/i18n";
import { PostStatus } from "@/features/post/post-status";
import type { PostListQueryInput } from "@/features/post/schema";
import { IdSchema } from "@/lib/validation/id.schema";
import { notFound } from "next/navigation";

const PAGE_SIZE = 10;

type ListContextInput = {
  locale: MultiLangEnum;
  menu?: Awaited<ReturnType<typeof getPublicMenu>>;
  slug?: string[];
};

/** 将动态列表路径解析为唯一的查询条件和本地化标题上下文。 */
export async function resolveListContext({
  locale,
  menu,
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
      const items = menu?.list ?? [];
      const paths = slug.slice(1);
      const category = paths.length
        ? items.find((item) => item.path === typeValue)
        : undefined;
      if (paths.length) {
        if (!category || paths.some((path) => !path)) notFound();
        // Use the same canonical ancestry as Header and sitemap, skipping
        // PAGE/CUSTOM ancestors whose paths are null.
        const canonicalPaths = getCurrentPathOfMenu({
          id: category.id,
          familyProp: "path",
          menu: items,
        });
        if (
          canonicalPaths.length !== paths.length ||
          canonicalPaths.some((path, index) => path !== paths[index])
        )
          notFound();
      }
      if (category) queryParams = { ...queryParams, categoryId: category.id };
      typeName = category?.title?.[locale] ?? "";
      break;
    }
    case "tags": {
      const matchedTag = await getPublicTag(typeValue);
      queryParams = {
        ...queryParams,
        tagId: matchedTag?.id ?? typeValue,
      };
      typeName = matchedTag?.name?.[locale] ?? "";
      break;
    }
    case "authors": {
      const matchedAuthor = await getPublicAuthor(typeValue);
      queryParams = {
        ...queryParams,
        authorId: matchedAuthor?.id ?? typeValue,
      };
      typeName = matchedAuthor?.name ?? "";
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
