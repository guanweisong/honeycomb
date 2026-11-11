import React, { Suspense } from "react";
import PostList from "@/app/(blog)/components/features/post/public/components/PostList";
import NoData from "@/app/(blog)/[locale]/list/[...slug]/components/NoData";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { createContentMetadata } from "@/app/(blog)/lib/metadata";
import { resolveListTitle } from "@/app/(blog)/[locale]/list/[...slug]/page.utils";
import { getCachedListPageData } from "@/app/(blog)/[locale]/list/[...slug]/page.data";
import { PostListSkeleton } from "@/app/(blog)/components/features/post/public/components/PostList/Skeleton";

/**
 * 列表页面组件。
 * 根据 URL 中的 slug 参数（如分类、标签、作者）显示相应的文章列表。
 * @param {PageProps<"/[locale]/list/[...slug]">} props - 组件属性。
 * @returns {Promise<JSX.Element>} 文章列表页面。
 */
export default function List(props: PageProps<"/[locale]/list/[...slug]">) {
  return (
    <>
      <Suspense fallback={<PostListSkeleton label="Loading articles" />}>
        <ListContent {...props} />
      </Suspense>
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

async function ListContent(props: PageProps<"/[locale]/list/[...slug]">) {
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
