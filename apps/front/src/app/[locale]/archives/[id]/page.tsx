import React, { ViewTransition } from "react";
import PostInfo from "@/components/PostInfo";
import Tags from "@/components/Tags";
import Card from "@/components/Card";
import { Link } from "@/i18n/navigation";
import Comment from "@/components/Comment";
import Markdown from "@/components/Markdown";
import { utcFormat } from "@/utils/utcFormat";
import PageTitle from "@/components/PageTitle";
import { getLocale, getTranslations } from "next-intl/server";
import { MultiLang } from "@honeycomb/types/multi.lang";
import { BookOpen, Calendar, Camera } from "lucide-react";
import { Metadata } from "next";
import { serverClient } from "@honeycomb/trpc/server";
import { MenuType } from "@honeycomb/types/menu/menu.type";
import { PostType } from "@honeycomb/types/post/post.type";

/**
 * 归档页面组件的属性接口。
 */
export interface ArchivesProps {
  /**
   * 包含文章 ID 和当前语言环境的 Promise。
   */
  params: Promise<{ id: string; locale: keyof MultiLang }>;
}

/**
 * 归档页面组件。
 * 用于显示单篇文章的详细内容，包括文章信息、标签、评论、相关文章等。
 * @param {ArchivesProps} props - 组件属性。
 * @returns {Promise<JSX.Element>} 归档页面。
 */
export default async function Archives(props: ArchivesProps) {
  const { id, locale } = await props.params;
  const postDetail = await serverClient.post.detail({ id });
  const t = await getTranslations("Archive");

  const [randomPostsList, commentsData] = await Promise.all([
    serverClient.post.getRandomByCategory({
      categoryId: postDetail.category.id,
    }),
    serverClient.comment.listByRef({ id, type: MenuType.CATEGORY }),
    serverClient.post.incrementViews({ id }),
  ]);
  const getTitle = () => {
    return postDetail.type === PostType.MOVIE
      ? `${postDetail.title?.[locale]} (${utcFormat(postDetail.movieTime!, "YYYY")})`
      : (postDetail.title?.[locale] ?? postDetail.quoteContent?.[locale]);
  };

  /**
   * 计算 JSONLD (JSON for Linking Data) 数据。
   * 根据文章类型生成结构化数据，以优化搜索引擎抓取。
   */
  const jsonLd: any = {
    "@context": "https://schema.org",
    name: getTitle(),
  };
  switch (postDetail.type) {
    case PostType.ARTICLE:
      jsonLd["@type"] = "Article";
      jsonLd.image = postDetail.cover?.url;
      jsonLd.description = postDetail.excerpt?.[locale];
      break;
    case PostType.MOVIE:
      jsonLd["@type"] = "Movie";
      jsonLd.image = postDetail.cover?.url;
      jsonLd.description = postDetail.excerpt?.[locale];
      break;
    case PostType.PHOTOGRAPH:
      jsonLd["@type"] = "Photograph";
      jsonLd.image = postDetail.cover?.url;
      jsonLd.description = postDetail.excerpt?.[locale];
      break;
    case PostType.QUOTE:
      jsonLd["@type"] = "Quotation";
      break;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewTransition name={`postTitle-${postDetail.id}`}>
        <PageTitle>{getTitle()}</PageTitle>
      </ViewTransition>
      <PostInfo
        id={postDetail.id}
        author={postDetail.author.name}
        date={postDetail.createdAt}
        comments={commentsData?.total}
        views={postDetail.views}
      />
      {postDetail.type !== PostType.QUOTE && (
        <div className="markdown-body my-3 lg:my-5">
          {postDetail.excerpt?.[locale] && (
            <ViewTransition name={`postExcerpt-${postDetail.id}`}>
              <div className="mb-2 p-2 bg-auto-front-gray/5">
                {postDetail.excerpt?.[locale]}
              </div>
            </ViewTransition>
          )}
          <ViewTransition name={`postContent-${postDetail.id}`}>
            <Markdown
              children={postDetail.content?.[locale]}
              imagesInContent={postDetail.imagesInContent}
            />
          </ViewTransition>
        </div>
      )}
      {[PostType.PHOTOGRAPH, PostType.MOVIE, PostType.QUOTE].includes(
        postDetail.type,
      ) && (
        <ul className="border-t-0.5 border-dashed border-auto-front-gray/30 py-2">
          {postDetail.type === PostType.PHOTOGRAPH && (
            <li className="flex items-center">
              <Camera size={20} />
              &nbsp;{utcFormat(postDetail.galleryTime!)}&nbsp; {t("shotIn")}
              &nbsp;
              {postDetail.galleryLocation?.[locale]}
            </li>
          )}
          {postDetail.type === PostType.MOVIE && (
            <li className="flex items-center">
              <Calendar size={20} />
              &nbsp; {t("released")}: {utcFormat(postDetail.movieTime!)}
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
      {randomPostsList.length > 0 && (
        <Card title={t("guessWhatYouLike")}>
          <ul className="leading-5 list-outside ml-4 mt-2 list-disc">
            {randomPostsList.map((item: any) => (
              <li key={item.id} className="my-2">
                <Link
                  href={`/archives/${item.id}`}
                  className="block link-light"
                >
                  {item.title?.[locale] || item.quoteContent?.[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Comment id={id} type={MenuType.CATEGORY} />
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
  const [setting, postDetail] = await Promise.all([
    serverClient.setting.index(),
    serverClient.post.detail({ id }),
  ]);
  const locale = (await getLocale()) as keyof MultiLang;

  /**
   * 格式化文章标题
   */
  const getTitle = () => {
    return postDetail.type === PostType.MOVIE
      ? `${postDetail.title?.[locale]} (${utcFormat(postDetail.movieTime!, "YYYY")})`
      : (postDetail.title?.[locale] ?? postDetail.quoteContent?.[locale]);
  };

  const title = decodeURI(getTitle() as string);

  const openGraph = {
    title: title,
    type: "article",
    images: postDetail.imagesInContent.map((item: any) => item.url),
    description: setting.siteName?.[locale],
  };

  return {
    title,
    description: setting.siteName?.[locale],
    openGraph,
  };
}

/**
 * 生成静态页面参数。
 * 在构建时预渲染页面，提高性能。
 * @returns {Promise<any[]>} 静态参数数组。
 */
export async function generateStaticParams() {
  return [];
}
