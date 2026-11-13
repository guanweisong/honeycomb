import PostList from "@/app/(blog)/components/features/post/public/components/PostList";
import NoData from "@/app/(blog)/[locale]/list/[...slug]/components/NoData";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { createContentMetadata } from "@/app/(blog)/lib/metadata";
import { getCategoryRouteSegments } from "@/app/(blog)/lib/category-route";
import { getCachedPublicMenu } from "@/app/(blog)/lib/public-menu";
import { getPublishedPostListStaticParams } from "@/app/(blog)/lib/server/list-static-params";
import { resolveListTitle } from "@/app/(blog)/[locale]/list/[...slug]/page.utils";
import { getCachedListPageData } from "@/app/(blog)/[locale]/list/[...slug]/page.data";
import { MenuType } from "@/features/menu/types/menu.type";

/** Generated list URLs must render completely during prerendering. */
export const ensureStatic = "navigation";

export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  const [{ list }, publishedFilterParams] = await Promise.all([
    getCachedPublicMenu(),
    getPublishedPostListStaticParams(),
  ]);
  const categorySlugs = new Map<string, string[]>([
    [JSON.stringify(["category"]), ["category"]],
  ]);

  for (const item of list) {
    if (item.type !== MenuType.CATEGORY) continue;
    const slug = [
      "category",
      ...getCategoryRouteSegments({ id: item.id, menu: list }),
    ];
    categorySlugs.set(JSON.stringify(slug), slug);
  }

  return [
    ...[...categorySlugs.values()].map((slug) => ({ slug })),
    ...publishedFilterParams
      .filter(({ locale }) => locale === params.locale)
      .map(({ slug }) => ({ slug })),
  ];
}

/**
 * 列表页面组件。
 * 根据 URL 中的 slug 参数（如分类、标签、作者）显示相应的文章列表。
 * @param {PageProps<"/[locale]/list/[...slug]">} props - 组件属性。
 * @returns {Promise<JSX.Element>} 文章列表页面。
 */
export default async function List(
  props: PageProps<"/[locale]/list/[...slug]">,
) {
  const { type, title, emptyLabel, queryParams, listResult, listHasContent } =
    await getListRouteData(props.params);

  return (
    <>
      {(type === "tags" || type === "authors") && (
        <div className="mb-2 lg:mb-4">{title}</div>
      )}
      {listHasContent ? (
        <PostList queryParams={queryParams} initialData={listResult} />
      ) : (
        <NoData title={emptyLabel} />
      )}
    </>
  );
}

function getListRouteData(
  params: PageProps<"/[locale]/list/[...slug]">["params"],
) {
  return params.then(async ({ locale, slug }) => {
    const normalizedSlug = slug ?? [];
    const [data, t] = await Promise.all([
      getCachedListPageData(locale, normalizedSlug),
      getTranslations({ locale, namespace: "PostList" }),
    ]);
    if (data.kind === "not-found") notFound();
    if (data.kind === "redirect") redirect(data.href);

    return {
      ...data,
      slug: normalizedSlug,
      title: resolveListTitle({
        type: data.type,
        typeName: data.typeName,
        siteName: data.siteName,
        tagTitle: (tag) => t("postUnderTag", { tag }),
        authorTitle: (author) => t("postUnderAuthor", { author }),
      }),
      description: data.siteSubName ?? undefined,
      emptyLabel: t("emptyTip"),
    };
  });
}

/**
 * 为列表页面生成元数据。
 * 用于设置页面的标题、描述、开放图谱等，以优化 SEO 和社交媒体分享。
 * @param props - 包含页面参数的属性。
 * @returns {Promise<Metadata>} 页面元数据。
 */
export async function generateMetadata(
  props: PageProps<"/[locale]/list/[...slug]">,
): Promise<Metadata> {
  const { title, description, locale, slug } = await getListRouteData(
    props.params,
  );
  return createContentMetadata({
    title,
    description,
    locale,
    path: `/list/${slug.map(encodeURIComponent).join("/")}`,
    type: "website",
  });
}
