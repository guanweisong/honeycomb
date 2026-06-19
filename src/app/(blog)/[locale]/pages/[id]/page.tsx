import React from "react";
import PostInfo from "@/app/(blog)/components/PostInfo";
import Comment from "@/app/(blog)/components/Comment";
import PageTitle from "@/app/(blog)/components/PageTitle";
import { getLocale } from "next-intl/server";
import { MultiLang } from "@/packages/trpc/api/types/multi.lang";
import { MenuType } from "@/packages/trpc/api/modules/menu/types/menu.type";
import { createServerClient } from "@/packages/trpc/api";
import { RichText } from "@/app/(blog)/components/RichText";
import { EnableStatus } from "@/packages/trpc/api/types/enable.status";
import { PageTemplate } from "@/packages/trpc/api/modules/page/types/page.template";
import { cn } from "@/packages/ui/lib/utils";
import { assertPublishedPost } from "./page.utils";
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
  const { id, locale } = (await props.params) as {
    id: string;
    locale: keyof MultiLang;
  };
  const [pageDetail, commentsData] = await Promise.all([
    serverClient.page.detail({ id }),
    serverClient.comment.listByRef({ id, type: MenuType.PAGE }),
    serverClient.page.incrementViews({ id }),
  ]);
  assertPublishedPost(pageDetail);
  const links =
    pageDetail?.template === PageTemplate.FRIENDLY_LINKS
      ? await serverClient.link.index({
          limit: 999,
          status: [EnableStatus.ENABLE],
        })
      : null;

  return (
    <>
      <PageTitle>{pageDetail?.title?.[locale]}</PageTitle>
      <PostInfo
        id={pageDetail?.id}
        author={pageDetail?.author?.name ?? ''}
        authorId={pageDetail?.author?.id}
        date={pageDetail?.createdAt as string}
        comments={commentsData?.total}
        views={pageDetail?.views as number}
      />
      <div className="my-3 lg:my-5">
        <div className="prose-editor">
          <RichText
            html={pageDetail?.content?.[locale]}
            images={pageDetail?.imagesInContent}
          />
        </div>
      </div>
      {pageDetail?.template === PageTemplate.FRIENDLY_LINKS ? (
        <div className="py-2 lg:py-4">
          {links?.total ? (
            links.list.map((item, index) => (
              <a
                key={item.url}
                href={item.url as string}
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
  const serverClient = await createServerClient();
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
 * @returns {Promise<Array<{ id: string }>>} 静态参数数组。
 */
export async function generateStaticParams() {
  return [];
}
