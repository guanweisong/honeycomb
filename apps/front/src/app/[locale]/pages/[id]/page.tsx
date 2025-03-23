import PageServer from "@/src/services/page";
import React from "react";
import PostInfo from "@/src/components/PostInfo";
import Comment from "@/src/components/Comment";
import CommentServer from "@/src/services/comment";
import { PageEntity } from "@/src/types/page/page.entity";
import PaginationResponse from "@/src/types/pagination.response";
import { CommentEntity } from "@/src/types/comment/comment.entity";
import Markdown from "@/src/components/Markdown";
import SettingServer from "@/src/services/setting";
import PageTitle from "@/src/components/PageTitle";
import ViewServer from "@/src/services/view";
import { UpdateType } from "@/src/types/view/update.view";
import { getLocale } from "next-intl/server";
import { MenuType } from "@/src/types/menu/MenuType";
import { MultiLang } from "@/src/types/Language";

export interface PagesProps {
  params: Promise<{ id: string; locale: keyof MultiLang }>;
}

export default async function Pages(props: PagesProps) {
  const { id, locale } = await props.params;
  const promise = [];
  promise.push(PageServer.indexPageDetail(id));
  promise.push(CommentServer.index(id, MenuType.PAGE));
  promise.push(ViewServer.updateViews({ type: UpdateType.Page, id }));
  const [pageDetail, commentsData] = (await Promise.all(promise)) as [
    PageEntity,
    PaginationResponse<CommentEntity[]>,
  ];

  return (
    <>
      <PageTitle>{pageDetail.title?.[locale]}</PageTitle>
      <PostInfo
        author={pageDetail.author.name}
        date={pageDetail.createdAt}
        comments={commentsData?.total}
        views={pageDetail.views}
      />
      <div className="markdown-body my-3 lg:my-5">
        <Markdown
          children={pageDetail.content?.[locale]}
          imagesInContent={pageDetail.imagesInContent}
        />
      </div>
      <Comment id={id} type={MenuType.PAGE} />
    </>
  );
}

type GenerateMetadataProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
export async function generateMetadata(props: GenerateMetadataProps) {
  const { id } = await props.params;
  const setting = await SettingServer.indexSetting();
  const pageDetail = await PageServer.indexPageDetail(id);
  const local = (await getLocale()) as keyof MultiLang;

  const title = pageDetail.title?.[local];

  const openGraph = {
    title: title,
    type: "article",
    description: setting.siteName?.[local],
    images: pageDetail.imagesInContent.map((item) => item.url),
  };

  return {
    title,
    description: setting.siteName?.[local],
    openGraph,
  };
}

export async function generateStaticParams() {
  return [];
}
