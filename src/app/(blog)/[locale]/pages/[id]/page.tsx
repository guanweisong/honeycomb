import React, { Suspense } from "react";
import PostInfo from "@/app/(blog)/components/features/post/public/PostInfo";
import { PostCommentCount } from "@/app/(blog)/components/features/post/public/PostInfo";
import Comment from "@/app/(blog)/components/features/comment/public/components/CommentClient";
import PageTitle from "@/app/(blog)/components/PageTitle";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import { MenuType } from "@/features/menu/types/menu.type";
import {
  getPublicComments,
  getPublicPageDetail,
  getPublicSetting,
  getPublicLinks,
} from "@/app/lib/server/public-queries";
import { RichText } from "@/app/(blog)/components/features/media/public/RichText";
import { PageViewTracker } from "@/app/(blog)/components/features/page/public/PageViewTracker";
import { PageTemplate } from "@/features/page/types/page.template";
import { cn } from "cn";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import LoadingState from "@/components/LoadingState";
import { assertPublishedPage } from "@/app/(blog)/[locale]/pages/[id]/page.utils";
import { assertDetailId } from "@/app/(blog)/lib/assert-detail-id";
import {
  createLocalizedAlternates,
  defaultSocialImage,
} from "@/app/(blog)/lib/metadata";
/**
 * 页面详情组件。
 * 用于显示单个页面的详细内容，包括页面信息、评论等。
 * @param {PageProps<"/[locale]/pages/[id]">} props - 组件属性。
 * @returns {Promise<JSX.Element>} 页面详情。
 */
export default function Pages(props: PageProps<"/[locale]/pages/[id]">) {
  return (
    <>
      <Suspense fallback={null}>
        <DynamicMetadataMarker />
      </Suspense>
      <Suspense fallback={<LoadingState variant="region" />}>
        <PageContent {...props} />
      </Suspense>
    </>
  );
}

async function PageContent(props: PageProps<"/[locale]/pages/[id]">) {
  const { id, locale: rawLocale } = await props.params;
  assertDetailId(id);
  const locale = normalizeMultiLangLocale(rawLocale);
  const pageDetail = await getPublicPageDetail(id);
  const publishedPage = assertPublishedPage(pageDetail);
  const queryCommentPromise = getPublicComments(id, MenuType.PAGE);
  // Own early rejection while translations/links suspend. Keep the original
  // promise rejected so the comment consumers still surface their error.
  void queryCommentPromise.catch(() => undefined);
  const [postInfoT, linkT] = await Promise.all([
    getTranslations({ locale, namespace: "PostInfo" }),
    getTranslations({ locale, namespace: "Link" }),
  ]);
  const links =
    publishedPage.template === PageTemplate.FRIENDLY_LINKS
      ? await getPublicLinks()
      : null;

  return (
    <>
      <PageTitle>{publishedPage.title?.[locale]}</PageTitle>
      <PostInfo
        id={publishedPage.id}
        author={publishedPage.author?.name ?? ""}
        authorId={publishedPage.author?.id}
        date={publishedPage.createdAt ?? ""}
        comments={
          <Suspense
            fallback={
              <LoadingState
                variant="inline"
                label={postInfoT("loading")}
                visuallyHiddenLabel
              />
            }
          >
            <PostCommentCount commentsPromise={queryCommentPromise} />
          </Suspense>
        }
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
                rel="noopener noreferrer"
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
            <div className="text-auto-front-gray/60">{linkT("emptyTip")}</div>
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

async function DynamicMetadataMarker() {
  await connection();
  return null;
}

/**
 * 为页面详情生成元数据。
 * 用于设置页面的标题、描述、开放图谱等，以优化 SEO 和社交媒体分享。
 * @param props - 包含页面参数的属性。
 * @returns {Promise<Metadata>} 页面元数据。
 */
export async function generateMetadata(
  props: PageProps<"/[locale]/pages/[id]">,
) {
  const { id, locale: rawLocale } = await props.params;
  assertDetailId(id);
  const [setting, pageDetail] = await Promise.all([
    getPublicSetting(),
    getPublicPageDetail(id),
  ]);
  const publishedPage = assertPublishedPage(pageDetail);
  const local = normalizeMultiLangLocale(rawLocale);

  const title = publishedPage.title?.[local];

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
