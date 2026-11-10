import React, { Suspense } from "react";
import PostList from "@/app/(blog)/components/features/post/public/components/PostList";
import NoData from "@/app/(blog)/[locale]/list/[...slug]/components/NoData";
import { getTranslations } from "next-intl/server";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import { createServerClient } from "@/app/trpc/server";
import { connection } from "next/server";
import { Metadata } from "next";
import {
  createContentMetadata,
  DynamicMetadataMarker,
} from "@/app/(blog)/lib/metadata";
import {
  resolveListContext,
  resolveListTitle,
} from "@/app/(blog)/[locale]/list/[...slug]/page.utils";
import LoadingState from "@/components/LoadingState";

/**
 * 列表页面组件。
 * 根据 URL 中的 slug 参数（如分类、标签、作者）显示相应的文章列表。
 * @param {PageProps<"/[locale]/list/[...slug]">} props - 组件属性。
 * @returns {Promise<JSX.Element>} 文章列表页面。
 */
export default function List(props: PageProps<"/[locale]/list/[...slug]">) {
  return (
    <>
      <Suspense fallback={null}>
        <DynamicMetadataMarker />
      </Suspense>
      <Suspense fallback={<LoadingState variant="region" />}>
        <ListContent {...props} />
      </Suspense>
    </>
  );
}

function getListRouteData(
  params: PageProps<"/[locale]/list/[...slug]">["params"],
) {
  const route = params.then(({ locale, slug }) => ({
    locale: normalizeMultiLangLocale(locale),
    slug: slug ?? [],
  }));
  const trpc = createServerClient();
  const context = route.then(resolveListContext);
  const translations = route.then(({ locale }) =>
    getTranslations({ locale, namespace: "PostList" }),
  );
  const presentation = Promise.all([
    route,
    context,
    translations,
    trpc.then((client) => client.setting.index()),
  ]).then(([{ locale, slug }, { type, typeName }, t, setting]) => ({
    locale,
    slug,
    type,
    title: resolveListTitle({
      type,
      typeName,
      siteName: setting?.siteName?.[locale],
      tagTitle: (tag) => t("postUnderTag", { tag }),
      authorTitle: (author) => t("postUnderAuthor", { author }),
    }),
    description: setting?.siteSubName?.[locale],
    emptyLabel: t("emptyTip"),
  }));
  return { context, presentation, trpc };
}

async function ListContent(props: PageProps<"/[locale]/list/[...slug]">) {
  await connection();
  const { context, presentation, trpc } = getListRouteData(props.params);
  const postList = context.then(async ({ queryParams }) => {
    const result = await (await trpc).post.index({
      ...queryParams,
      cursor: null,
    });
    return {
      queryParams,
      result: { ...result, snapshotVersion: crypto.randomUUID() },
    };
  });
  const [{ type, title, emptyLabel }, { queryParams, result }] =
    await Promise.all([presentation, postList]);
  const { snapshotVersion, ...post } = result;

  return (
    <>
      {(type === "tags" || type === "authors") && (
        <div className="mb-2 lg:mb-4">{title}</div>
      )}
      {post.list.length > 0 || post.nextCursor ? (
        <PostList
          initData={post}
          queryParams={queryParams}
          snapshotVersion={snapshotVersion}
        />
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
  await connection();
  const { title, description, locale, slug } = await getListRouteData(
    props.params,
  ).presentation;
  return createContentMetadata({
    title,
    description,
    locale,
    path: `/list/${slug.map(encodeURIComponent).join("/")}`,
    type: "website",
  });
}
