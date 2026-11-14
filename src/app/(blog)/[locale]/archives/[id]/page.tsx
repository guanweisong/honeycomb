import React, { Suspense, ViewTransition } from "react";
import { TRPCError } from "@trpc/server";
import PostInfo from "@/app/(blog)/components/features/post/public/PostInfo";
import Tags from "@/app/(blog)/components/features/post/public/Tags";
import Recommendations from "./Recommendations";
import {
  PublicCommentCount,
  PublicCommentSection,
  PublicCommentSectionSkeleton,
} from "@/app/(blog)/components/features/comment/public/PublicCommentSection";
import CommentClient from "@/app/(blog)/components/features/comment/public/components/CommentClient";
import { EnableStatus } from "@/lib/validation/enable-status";
import PageTitle from "@/app/(blog)/components/PageTitle";
import { utcFormat } from "@/lib/ui/utc-format";
import { getTranslations } from "next-intl/server";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import { BookOpen, Calendar, Camera } from "lucide-react";
import { Metadata } from "next";
import { createServerClient } from "@/app/trpc/server";
import { getCachedMetadataSettings } from "@/app/(blog)/lib/metadata-settings";
import { MenuType } from "@/features/menu/types/menu.type";
import { PostType } from "@/features/post/types/post.type";
import { RichText } from "@/app/(blog)/components/features/media/public/RichText";
import { ContentViewTracker } from "@/app/(blog)/components/ContentViewTracker";
import { serializeJsonLd } from "@/lib/security/serialize-json-ld";
import {
  assertPostDetail,
  assertPostCategory,
  createPostJsonLd,
  getPostTitle,
  handlePostDetailError,
} from "@/app/(blog)/[locale]/archives/[id]/page.utils";
import { createContentMetadata } from "@/app/(blog)/lib/metadata";
import LoadingState from "@/components/LoadingState";
import { assertDetailId } from "@/app/(blog)/lib/assert-detail-id";
import { cacheLife, cacheTag } from "next/cache";
import {
  POST_DETAILS_CACHE_TAG,
  postDetailCacheTag,
} from "@/lib/cache/public-cache-keys";
import { getPublishedPostDetailStaticParams } from "@/app/(blog)/lib/server/detail-static-params";

export function generateStaticParams() {
  return getPublishedPostDetailStaticParams();
}

async function getPrefetchedPostDetail(id: string) {
  "use cache";

  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag(POST_DETAILS_CACHE_TAG, postDetailCacheTag(id));

  const trpc = await createServerClient({
    requestContext: { requestId: "public-detail-cache-fill" },
    skipRequestObservability: true,
  });
  try {
    return await trpc.post.detail({ id });
  } catch (error) {
    // Keep framework not-found control flow outside the cached scope.
    if (error instanceof TRPCError && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

export default async function Archives(
  props: PageProps<"/[locale]/archives/[id]">,
) {
  const { id, locale: rawLocale } = await props.params;
  assertDetailId(id);
  const locale = normalizeMultiLangLocale(rawLocale);
  let postDetail: Awaited<ReturnType<typeof getPrefetchedPostDetail>>;
  try {
    postDetail = assertPostDetail(await getPrefetchedPostDetail(id));
  } catch (error) {
    handlePostDetailError(error);
  }
  const [t, postInfoT] = await Promise.all([
    getTranslations({ locale, namespace: "Archive" }),
    getTranslations({ locale, namespace: "PostInfo" }),
  ]);

  const category = assertPostCategory(postDetail);
  const hasComments = postDetail.commentStatus === EnableStatus.ENABLE;
  const title = getPostTitle(postDetail, locale);
  const jsonLd = createPostJsonLd(postDetail, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ViewTransition name={`postTitle-${postDetail.id}`}>
        <PageTitle>{title}</PageTitle>
      </ViewTransition>
      <PostInfo
        id={postDetail.id}
        author={postDetail.author?.name ?? ""}
        authorId={postDetail.authorId}
        date={postDetail.createdAt ?? ""}
        comments={
          hasComments ? (
            <Suspense
              fallback={
                <LoadingState
                  variant="inline"
                  label={postInfoT("loading")}
                  visuallyHiddenLabel
                />
              }
            >
              <PublicCommentCount
                id={id}
                type={MenuType.CATEGORY}
                locale={locale}
              />
            </Suspense>
          ) : undefined
        }
        views={
          <ContentViewTracker
            kind="post"
            id={id}
            initialViews={postDetail.views ?? 0}
          />
        }
      />
      {postDetail.type !== PostType.QUOTE && (
        <div className="my-3 lg:my-5">
          {postDetail.excerpt?.[locale] && (
            <ViewTransition name={`postExcerpt-${postDetail.id}`}>
              <div className="mb-2 p-2 bg-auto-front-gray/5">
                {postDetail.excerpt?.[locale]}
              </div>
            </ViewTransition>
          )}
          <ViewTransition name={`postContent-${postDetail.id}`}>
            <div className="prose-editor">
              <RichText
                html={postDetail?.content?.[locale]}
                images={postDetail?.imagesInContent}
              />
            </div>
          </ViewTransition>
        </div>
      )}
      {(postDetail.type === PostType.PHOTOGRAPH ||
        postDetail.type === PostType.MOVIE ||
        postDetail.type === PostType.QUOTE) && (
        <ul className="border-t-0.5 border-dashed border-auto-front-gray/30 py-2">
          {postDetail.type === PostType.PHOTOGRAPH &&
            postDetail.galleryTime && (
              <li className="flex items-center">
                <Camera size={20} />
                &nbsp;{utcFormat(postDetail.galleryTime)}&nbsp; {t("shotIn")}
                &nbsp;
                {postDetail.galleryLocation?.[locale]}
              </li>
            )}
          {postDetail.type === PostType.MOVIE && postDetail.movieTime && (
            <li className="flex items-center">
              <Calendar size={20} />
              &nbsp; {t("released")}: {utcFormat(postDetail.movieTime)}
            </li>
          )}
          {postDetail.type === PostType.QUOTE && (
            <li className="flex items-center">
              <BookOpen size={20} />
              &nbsp; {t("quoteFrom")}: {postDetail.quoteAuthor?.[locale]}
            </li>
          )}
        </ul>
      )}
      <Tags {...postDetail} />
      <Suspense fallback={null}>
        <Recommendations
          categoryId={category.id}
          locale={locale}
          postId={postDetail.id}
          title={t("guessWhatYouLike")}
        />
      </Suspense>
      {hasComments && (
        <CommentClient id={id} type={MenuType.CATEGORY}>
          <Suspense
            fallback={
              <PublicCommentSectionSkeleton label={postInfoT("loading")} />
            }
          >
            <PublicCommentSection
              id={id}
              type={MenuType.CATEGORY}
              locale={locale}
            />
          </Suspense>
        </CommentClient>
      )}
    </>
  );
}

/**
 * 为归档页面生成元数据。
 * 用于设置页面的标题、描述、开放图谱等，以优化 SEO 和社交媒体分享。
 * @param props - 包含页面参数的属性。
 * @returns {Promise<Metadata>} 页面元数据。
 */
export async function generateMetadata(
  props: PageProps<"/[locale]/archives/[id]">,
): Promise<Metadata> {
  const { id, locale: rawLocale } = await props.params;
  assertDetailId(id);
  let postDetail: Awaited<ReturnType<typeof getPrefetchedPostDetail>>;
  let setting: Awaited<ReturnType<typeof getCachedMetadataSettings>>;
  try {
    [postDetail, setting] = await Promise.all([
      getPrefetchedPostDetail(id),
      getCachedMetadataSettings(),
    ]);
    postDetail = assertPostDetail(postDetail);
  } catch (error) {
    handlePostDetailError(error);
  }
  const locale = normalizeMultiLangLocale(rawLocale);

  /**
   * 格式化文章标题
   */
  const title = getPostTitle(postDetail, locale) ?? "";

  return createContentMetadata({
    title,
    description: setting?.siteName?.[locale],
    locale,
    path: `/archives/${encodeURIComponent(id)}`,
    type: "article",
  });
}
