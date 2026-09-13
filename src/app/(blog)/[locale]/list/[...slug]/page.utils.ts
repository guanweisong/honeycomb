import type { createServerClient } from "@/packages/trpc/api";
import type { getPublicMenu } from "@/app/lib/server/public-queries";
import type { MultiLangEnum } from "@/packages/domain/localization/i18n";
import { PostStatus } from "@/packages/domain/content/post-status";
import type { PostListQueryInput } from "@/features/post/schemas/post.list.query.schema";

const PAGE_SIZE = 10;

type ListLookupClient = Pick<
  Awaited<ReturnType<typeof createServerClient>>,
  "tag" | "user"
>;

type ListContextInput = {
  client: ListLookupClient;
  locale: MultiLangEnum;
  menu: Awaited<ReturnType<typeof getPublicMenu>>;
  slug?: string[];
};

/** 将动态列表路径解析为唯一的查询条件和本地化标题上下文。 */
export async function resolveListContext({
  client,
  locale,
  menu,
  slug = [],
}: ListContextInput) {
  const type = slug[0];
  const typeValue = slug.at(-1) ?? "";
  let typeName = typeValue;
  let queryParams: PostListQueryInput = {
    status: [PostStatus.PUBLISHED],
    limit: PAGE_SIZE,
    sortField: "createdAt",
  };

  switch (type) {
    case "category": {
      const category = menu?.list.find((item) => item.path === typeValue);
      if (category) queryParams = { ...queryParams, categoryId: category.id };
      typeName = category?.title?.[locale] ?? "";
      break;
    }
    case "tags": {
      const matchedTag = (
        await client.tag.index({ limit: 1, page: 1, id: [typeValue] })
      ).list[0];
      queryParams = {
        ...queryParams,
        tagId: matchedTag?.id ?? typeValue,
      };
      typeName = matchedTag?.name?.[locale] ?? "";
      break;
    }
    case "authors": {
      const matchedAuthor = await client.user.detail({ id: typeValue });
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
