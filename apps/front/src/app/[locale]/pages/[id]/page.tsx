import React from "react";
import PostInfo from "@/components/PostInfo";
import Comment from "@/components/Comment";
import Markdown from "@/components/Markdown";
import PageTitle from "@/components/PageTitle";
import { getLocale } from "next-intl/server";
import { MultiLang } from "@honeycomb/types/multi.lang";
import { MenuType } from "@honeycomb/types/menu/menu.type";
import { serverClient } from "@honeycomb/trpc/server";
/**
 * 页面详情组件的属性接口。
 */
export interface PagesProps {
  /**
   * 包含页面 ID 和当前语言环境的 Promise。
   */
  params: Promise<{ id: string; locale: keyof MultiLang }>;
}

/**
 * 页面详情组件。
 * 用于显示单个页面的详细内容，包括页面信息、评论等。
 * @param {PagesProps} props - 组件属性。
 * @returns {Promise<JSX.Element>} 页面详情。
 */
export default async function Pages(props: PagesProps) {
  const { id, locale } = await props.params;
  const [pageDetail, commentsData] = await Promise.all([
    serverClient.page.detail({ id }),
    serverClient.comment.listByRef({ id, type: MenuType.PAGE }),
    serverClient.page.incrementViews({ id }),
  ]);

  return (
    <>
      <PageTitle>{pageDetail?.title?.[locale]}</PageTitle>
      <PostInfo
        id={pageDetail?.id}
        author={pageDetail?.author.name}
        date={pageDetail?.createdAt as string}
        comments={commentsData?.total}
        views={pageDetail?.views as number}
      />
      <div className="markdown-body my-3 lg:my-5">
        <Markdown
          children={pageDetail?.content?.[locale]}
          imagesInContent={pageDetail?.imagesInContent}
        />
      </div>
      <Comment id={id} type={MenuType.PAGE} />
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
  params: Promise<{ id: string }>;
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
  const { id } = await props.params;
  const [setting, pageDetail] = await Promise.all([
    serverClient.setting.index(),
    serverClient.page.detail({ id }),
  ]);
  const local = (await getLocale()) as keyof MultiLang;

  const title = pageDetail?.title?.[local];

  const openGraph = {
    title: title,
    type: "article",
    description: setting.siteName?.[local],
    images: pageDetail?.imagesInContent?.map((item) => item.url),
  };

  return {
    title,
    description: setting.siteName?.[local],
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
