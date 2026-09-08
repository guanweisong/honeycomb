import React from "react";
import PostInfo from "@/app/(blog)/components/PostInfo";
import Comment from "@/features/comment/public/components";
import PageTitle from "@/app/(blog)/components/PageTitle";
import { normalizeMultiLangLocale } from "@/packages/domain/localization/multi-lang";
import { MenuType } from "@/packages/domain/navigation/menu";
import { createServerClient } from "@/packages/trpc/api";
import {
  getPublicComments,
  getPublicPageDetail,
  getPublicSetting,
} from "@/app/lib/server/public-queries";
import { RichText } from "@/app/(blog)/components/RichText";
import { PageViewTracker } from "@/app/(blog)/components/ViewTracker";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { cn } from "@/packages/ui/lib/utils";
import { assertPublishedPost } from "./page.utils";
import {
  createLocalizedAlternates,
  defaultSocialImage,
} from "@/app/(blog)/lib/metadata";
/**
 * 页面详情组件的属性接口。
 */
export interface PagesProps {
  /**
   * 包含页面 ID 和当前语言环境的 Promise。
   */
  params: Promise<{ id: string; locale: string }>;
}

/**
 * 页面详情组件。
 * 用于显示单个页面的详细内容，包括页面信息、评论等。
 * @param {PagesProps} props - 组件属性。
 * @returns {Promise<JSX.Element>} 页面详情。
 */
export default async function Pages(props: PagesProps) {
  const serverClient = await createServerClient();
  const { id, locale: rawLocale } = await props.params;
  const locale = normalizeMultiLangLocale(rawLocale);
  const queryCommentPromise = getPublicComments(id, MenuType.PAGE);
  const [pageDetail, commentsData] = await Promise.all([
    getPublicPageDetail(id),
    queryCommentPromise,
  ]);
  const publishedPage = assertPublishedPost(pageDetail);
  const links =
    publishedPage.template === PageTemplate.FRIENDLY_LINKS
      ? await serverClient.link.index({
          limit: 999,
          status: [EnableStatus.ENABLE],
        })
      : null;

  return (
    <>
      <PageTitle>{publishedPage.title?.[locale]}</PageTitle>
      <PostInfo
        id={publishedPage.id}
        author={publishedPage.author?.name ?? ""}
        authorId={publishedPage.author?.id}
        date={publishedPage.createdAt ?? ""}
        comments={commentsData?.total}
        views={
          <PageViewTracker id={id} initialViews={publishedPage.views ?? 0} />
        }
      />
      <div className="my-3 lg:my-5">
        <div className="prose-editor">
          <RichText
            html={publishedPage.content?.[locale]}
            images={publishedPage.imagesInContent}
          />
        </div>
      </div>
      {publishedPage.template === PageTemplate.FRIENDLY_LINKS ? (
        <div className="py-2 lg:py-4">
          {links?.total ? (
            links.list.map((item, index) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                className={cn("flex items-center py-2", {
                  "border-t-0.5 border-dashed border-auto-front-gray/30":
                    index > 0,
                })}
              >
                <span
                  className="inline-block w-10 h-10 bg-no-repeat bg-center bg-contain mr-2"
                  style={{ backgroundImage: `url(${item.logo})` }}
                />
                <div>
                  <div>{item.name}</div>
                  <div className="text-auto-front-gray/50 text-base">
                    {item.description}
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="text-auto-front-gray/60">暂无友情链接</div>
          )}
        </div>
      ) : null}
      <Comment
        id={id}
        type={MenuType.PAGE}
        queryCommentPromise={queryCommentPromise}
      />
    </>
  );
}

/**
 * `generateMetadata` 函数的属性接口。
 */
type GenerateMetadataProps = {
  /**
   * 包含页面 ID 的 Promise。
   */
  params: Promise<{ id: string; locale: string }>;
  /**
   * 包含搜索参数的 Promise。
   */
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
/**
 * 为页面详情生成元数据。
 * 用于设置页面的标题、描述、开放图谱等，以优化 SEO 和社交媒体分享。
 * @param {GenerateMetadataProps} props - 包含页面参数的属性。
 * @returns {Promise<Metadata>} 页面元数据。
 */
export async function generateMetadata(props: GenerateMetadataProps) {
  const { id, locale: rawLocale } = await props.params;
  const [setting, pageDetail] = await Promise.all([
    getPublicSetting(),
    getPublicPageDetail(id),
  ]);
  const local = normalizeMultiLangLocale(rawLocale);

  const title = pageDetail?.title?.[local];

  const openGraph = {
    title: title,
    type: "article",
    description: setting?.siteName?.[local],
  };

  return {
    title,
    description: setting?.siteName?.[local],
    alternates: createLocalizedAlternates(
      local,
      `/pages/${encodeURIComponent(id)}`,
    ),
    openGraph: { ...openGraph, images: [defaultSocialImage] },
    twitter: {
      card: "summary_large_image",
      title,
      description: setting?.siteName?.[local],
      images: [defaultSocialImage],
    },
  };
}

/**
 * 生成静态页面参数。
 * 在构建时预渲染页面，提高性能。
 * @returns {Promise<Array<{ id: string }>>} 静态参数数组。
 */
export async function generateStaticParams() {
  return [];
}
