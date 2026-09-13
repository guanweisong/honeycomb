import React from "react";
import { PostList } from "@/features/post/public";
import NoData from "@/app/(blog)/components/NoData";
import { getTranslations } from "next-intl/server";
import { normalizeMultiLangLocale } from "@/packages/domain/localization/multi-lang";
import { createServerClient } from "@/packages/trpc/api";
import {
  getPublicMenu,
  getPublicSetting,
} from "@/app/lib/server/public-queries";
import { Metadata } from "next";
import {
  createLocalizedAlternates,
  defaultSocialImage,
} from "@/app/(blog)/lib/metadata";
import { resolveListContext, resolveListTitle } from "./page.utils";

/**
 * 列表页面组件。
 * 根据 URL 中的 slug 参数（如分类、标签、作者）显示相应的文章列表。
 * @param {PageProps<"/[locale]/list/[...slug]">} props - 组件属性。
 * @returns {Promise<JSX.Element>} 文章列表页面。
 */
export default async function List(
  props: PageProps<"/[locale]/list/[...slug]">,
) {
  const serverClient = await createServerClient();
  const [setting, menu] = await Promise.all([
    getPublicSetting(),
    getPublicMenu(),
  ]);
  const params = await props.params;
  const locale = normalizeMultiLangLocale(params.locale);
  const t = await getTranslations("PostList");

  const { queryParams, type, typeName } = await resolveListContext({
    client: serverClient,
    locale,
    menu,
    slug: params.slug,
  });

  const post = await serverClient.post.index(queryParams);
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
  const serverClient = await createServerClient();
  const params = await props.params;
  const locale = normalizeMultiLangLocale(params.locale);
  const [setting, menu] = await Promise.all([
    getPublicSetting(),
    getPublicMenu(),
  ]);
  const t = await getTranslations("PostList");
  const slug = params.slug ?? [];
  const { type, typeName } = await resolveListContext({
    client: serverClient,
    locale,
    menu,
    slug,
  });
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

/**
 * 生成静态页面参数。
 * 在构建时预渲染页面，提高性能。
 * @returns {Promise<Array<{ slug: string[] }>>} 静态参数数组。
 */
export async function generateStaticParams() {
  return [];
}
