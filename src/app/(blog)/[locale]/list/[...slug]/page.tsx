import React, { Suspense } from "react";
import PostList from "@/features/post/public/components/PostList";
import NoData from "@/app/(blog)/[locale]/list/[...slug]/_components/NoData";
import { getTranslations } from "next-intl/server";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import {
  getPublicMenu,
  getPublicPostList,
  getPublicSetting,
} from "@/app/lib/server/public-queries";
import { Metadata } from "next";
import {
  createLocalizedAlternates,
  defaultSocialImage,
} from "@/app/(blog)/lib/metadata";
import { resolveListContext, resolveListTitle } from "@/app/(blog)/[locale]/list/[...slug]/page.utils";
import { connection } from "next/server";
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

async function ListContent(props: PageProps<"/[locale]/list/[...slug]">) {
  const settingPromise = getPublicSetting();
  const translationsPromise = props.params.then(({ locale }) =>
    getTranslations({
      locale: normalizeMultiLangLocale(locale),
      namespace: "PostList",
    }),
  );
  const contextPromise = props.params.then(async (params) =>
    resolveListContext({
      locale: normalizeMultiLangLocale(params.locale),
      menu:
        params.slug?.[0] === "category" && params.slug.length > 1
          ? await getPublicMenu()
          : undefined,
      slug: params.slug,
    }),
  );
  const postPromise = contextPromise.then(({ queryParams }) =>
    getPublicPostList(queryParams),
  );
  const [setting, t, { queryParams, type, typeName }, post, params] =
    await Promise.all([
      settingPromise,
      translationsPromise,
      contextPromise,
      postPromise,
      props.params,
    ]);
  const locale = normalizeMultiLangLocale(params.locale);
  const title = resolveListTitle({
    type,
    typeName,
    siteName: setting?.siteName?.[locale],
    tagTitle: (tag) => t("postUnderTag", { tag }),
    authorTitle: (author) => t("postUnderAuthor", { author }),
  });

  return (
    <>
      {(type === "tags" || type === "authors") && (
        <div className="mb-2 lg:mb-4">{title}</div>
      )}
      {post.list.length > 0 ? (
        <PostList initData={post} queryParams={queryParams} />
      ) : (
        <NoData title={t("emptyTip")} />
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
  const settingPromise = getPublicSetting();
  const translationsPromise = props.params.then(({ locale }) =>
    getTranslations({
      locale: normalizeMultiLangLocale(locale),
      namespace: "PostList",
    }),
  );
  const contextPromise = props.params.then(async (params) =>
    resolveListContext({
      locale: normalizeMultiLangLocale(params.locale),
      menu:
        params.slug?.[0] === "category" && params.slug.length > 1
          ? await getPublicMenu()
          : undefined,
      slug: params.slug,
    }),
  );
  const [params, setting, t, { type, typeName }] = await Promise.all([
    props.params,
    settingPromise,
    translationsPromise,
    contextPromise,
  ]);
  const locale = normalizeMultiLangLocale(params.locale);
  const slug = params.slug ?? [];
  const title = resolveListTitle({
    type,
    typeName,
    siteName: setting?.siteName?.[locale],
    tagTitle: (tag) => t("postUnderTag", { tag }),
    authorTitle: (author) => t("postUnderAuthor", { author }),
  });

  const openGraph = {
    title: title,
    type: "website",
    images: [defaultSocialImage],
    description: setting?.siteSubName?.[locale],
  };

  return {
    title,
    description: setting?.siteSubName?.[locale],
    alternates: createLocalizedAlternates(
      locale,
      `/list/${slug.map(encodeURIComponent).join("/")}`,
    ),
    openGraph,
    twitter: {
      card: "summary_large_image",
      title,
      description: setting?.siteSubName?.[locale],
      images: [defaultSocialImage],
    },
  };
}

async function DynamicMetadataMarker() {
  await connection();
  return null;
}
