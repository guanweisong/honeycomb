import React, { ViewTransition } from "react";
import PostInfo from "@/app/(blog)/components/PostInfo";
import Tags from "@/app/(blog)/components/Tags";
import Card from "@/packages/ui/blog/Card";
import { Link } from "@/packages/ui/navigation/blog-navigation";
import Comment from "@/features/comment/public/components";
import PageTitle from "@/app/(blog)/components/PageTitle";
import { utcFormat } from "@/packages/ui/blog/utc-format";
import { getLocale, getTranslations } from "next-intl/server";
import { normalizeMultiLangLocale } from "@/packages/domain/localization/multi-lang";
import { BookOpen, Calendar, Camera } from "lucide-react";
import { Metadata } from "next";
import { createServerClient } from "@/packages/trpc/api";
import {
  getPublicComments,
  getPublicPostDetail,
  getPublicSetting,
} from "@/app/lib/server/public-queries";
import { MenuType } from "@/packages/domain/navigation/menu";
import { PostType } from "@/packages/domain/content/post";
import { RichText } from "@/app/(blog)/components/RichText";
import { PostViewTracker } from "@/app/(blog)/components/ViewTracker";
import { serializeJsonLd } from "@/packages/infrastructure/security/serialize-json-ld";
import {
  assertPostDetail,
  createPostJsonLd,
  getPostTitle,
  handlePostDetailError,
} from "./page.utils";

/**
 * 归档页面组件的属性接口。
 */
export interface ArchivesProps {
  /**
   * 包含文章 ID 和当前语言环境的 Promise。
   */
  params: Promise<{ id: string; locale: string }>;
}

/**
 * 归档页面组件。
 * 用于显示单篇文章的详细内容，包括文章信息、标签、评论、相关文章等。
 * @param {ArchivesProps} props - 组件属性。
 * @returns {Promise<JSX.Element>} 归档页面。
 */
export default async function Archives(props: ArchivesProps) {
  const serverClient = await createServerClient();
  const { id, locale: rawLocale } = await props.params;
  const locale = normalizeMultiLangLocale(rawLocale);
  let postDetail: Awaited<ReturnType<typeof getPublicPostDetail>>;
  try {
    postDetail = assertPostDetail(await getPublicPostDetail(id));
  } catch (error) {
    handlePostDetailError(error);
  }
  const t = await getTranslations("Archive");

  if (!postDetail.category) {
    throw new Error(`Post ${id} is missing category relation`);
  }

  const queryCommentPromise = getPublicComments(id, MenuType.CATEGORY);
  const [randomPostsList, commentsData] = await Promise.all([
    serverClient.post.getRandomByCategory({
      categoryId: postDetail.category.id,
    }),
    queryCommentPromise,
  ]);
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
        comments={commentsData?.total}
        views={
          <PostViewTracker id={id} initialViews={postDetail.views ?? 0} />
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
          {postDetail.type === PostType.PHOTOGRAPH && postDetail.galleryTime && (
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
      {randomPostsList.filter((item) => item.id !== postDetail?.id).length >
        0 && (
        <Card title={t("guessWhatYouLike")}>
          <ul className="leading-5 list-outside ml-4 mt-2 list-disc">
            {randomPostsList
              .filter((item) => item.id !== postDetail?.id)
              .map((item) => (
                <li key={item.id} className="my-2">
                  <Link href={`/archives/${item.id}`} className="link-light">
                    {item.title?.[locale] || item.quoteContent?.[locale]}
                  </Link>
                </li>
              ))}
          </ul>
        </Card>
      )}
      <Comment
        id={id}
        type={MenuType.CATEGORY}
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
   * 包含文章 ID 的 Promise。
   */
  params: Promise<{ id: string }>;
  /**
   * 包含搜索参数的 Promise。
   */
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * 为归档页面生成元数据。
 * 用于设置页面的标题、描述、开放图谱等，以优化 SEO 和社交媒体分享。
 * @param {GenerateMetadataProps} props - 包含页面参数的属性。
 * @returns {Promise<Metadata>} 页面元数据。
 */
export async function generateMetadata(
  props: GenerateMetadataProps,
): Promise<Metadata> {
  const { id } = await props.params;
  let setting: Awaited<ReturnType<typeof getPublicSetting>>;
  let postDetail: Awaited<ReturnType<typeof getPublicPostDetail>>;
  try {
    [setting, postDetail] = await Promise.all([
      getPublicSetting(),
      getPublicPostDetail(id),
    ]);
    postDetail = assertPostDetail(postDetail);
  } catch (error) {
    handlePostDetailError(error);
  }
  const locale = normalizeMultiLangLocale(await getLocale());

  /**
   * 格式化文章标题
   */
  const title = decodeURI(getPostTitle(postDetail, locale) ?? "");

  const openGraph = {
    title: title,
    type: "article",
    description: setting?.siteName?.[locale],
  };

  return {
    title,
    description: setting?.siteName?.[locale],
    openGraph,
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
