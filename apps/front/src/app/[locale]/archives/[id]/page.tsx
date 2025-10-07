import React, { unstable_ViewTransition as ViewTransition } from "react";
import PostInfo from "@/components/PostInfo";
import Tags from "@/components/Tags";
import Card from "@/components/Card";
import { Link } from "@/i18n/navigation";
import Comment from "@/components/Comment";
import Markdown from "@/components/Markdown";
import { utcFormat } from "@/utils/utcFormat";
import PageTitle from "@/components/PageTitle";
import { getLocale, getTranslations } from "next-intl/server";
import { MultiLang } from "@/types/Language";
import { BookOpen, Calendar, Camera } from "lucide-react";
import { Metadata } from "next";
import { serverClient } from "@honeycomb/trpc/server";
import { MenuType, PostType } from "@honeycomb/db";

export interface ArchivesProps {
  params: Promise<{ id: string; locale: keyof MultiLang }>;
}

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

  /**
   * 格式化文章标题
   */
  const getTitle = () => {
    return postDetail.type === PostType.MOVIE
      ? `${postDetail.title?.[locale]} (${utcFormat(postDetail.movieTime!, "YYYY")})`
      : (postDetail.title?.[locale] ?? postDetail.quoteContent?.[locale]);
  };

  /**
   * 计算 JSONLD
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

  console.log("postDetail", postDetail);

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

type GenerateMetadataProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

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

export async function generateStaticParams() {
  return [];
}
