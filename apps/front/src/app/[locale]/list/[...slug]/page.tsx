import React from "react";
import { PostListQuery } from "@/types/post/post.list.query";
import PostList from "@/components/PostList";
import NoData from "@/components/NoData";
import { getLocale, getTranslations } from "next-intl/server";
import { MultiLang } from "@/types/Language";
import { serverClient } from "@honeycomb/trpc/server";
import { PostStatus, MenuEntity } from "@honeycomb/db/src/types";

const PAGE_SIZE = 10;

export interface ListProps {
  params: Promise<{ slug: string[]; locale: keyof MultiLang }>;
}

export default async function List(props: ListProps) {
  const [setting, menu] = await Promise.all([
    serverClient.setting.index(),
    serverClient.menu.index(),
  ]);
  const params = await props.params;
  const t = await getTranslations("PostList");

  const type =
    typeof params?.slug !== "undefined" ? params?.slug[0] : undefined;

  let queryParams = {
    status: [PostStatus.PUBLISHED],
    limit: PAGE_SIZE,
  } as PostListQuery;
  let typeName = decodeURI(params?.slug?.pop() ?? "");
  switch (type) {
    case "category":
      // 获取分类ID
      const categoryId = menu?.list?.find(
        (item: MenuEntity) => item.path === typeName,
      )?.id;
      if (typeof categoryId !== "undefined") {
        queryParams = { ...queryParams, categoryId: categoryId };
      }
      typeName =
        menu?.list?.find((item: MenuEntity) => item.path === typeName)?.title?.[
          params.locale
        ] || "";
      break;
    case "tags":
      queryParams = { ...queryParams, tagName: typeName };
      break;
    case "authors":
      queryParams = { ...queryParams, userName: typeName };
      break;
  }
  console.log("queryParams", queryParams);

  const post = await serverClient.post.index(queryParams);

  /**
   * 获取页面标题
   */
  const getTitle = () => {
    let title = "";
    switch (type) {
      case "tags":
        title = t("postUnderTag", { tag: typeName });
        break;
      case "authors":
        title = t("postUnderAuthor", { author: typeName });
        break;
      default:
        if (typeName) {
          title = `${typeName}_${setting.siteName?.[params.locale]}`;
        } else {
          title = setting.siteName?.[params.locale];
        }
    }
    return title;
  };

  return (
    <>
      {["tags", "authors"].includes(type!) && (
        <div className="mb-2 lg:mb-4">{getTitle()}</div>
      )}
      {post.list.length > 0 ? (
        <PostList
          initData={post.list}
          pageSize={PAGE_SIZE}
          queryParams={queryParams}
        />
      ) : (
        <NoData title={t("emptyTip")} />
      )}
    </>
  );
}

type GenerateMetadataProps = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: GenerateMetadataProps) {
  const [setting, menu, locale] = await Promise.all([
    serverClient.setting.index(),
    serverClient.menu.index(),
    getLocale().then((res) => res as keyof MultiLang),
  ]);
  const t = await getTranslations("PostList");
  const params = await props.params;
  const slug = params?.slug ?? [];
  // 获取第一个路径部分作为类型
  const type =
    typeof slug !== "undefined" && slug.length > 0 ? slug[0] : undefined;
  let typeName = slug?.pop() ?? "";
  // 根据 `type` 和 `menu` 来查找类型名称
  switch (type) {
    case "category":
      typeName =
        menu?.list?.find((item: MenuEntity) => item.path === typeName)?.title?.[
          locale
        ] || "";
      break;
    default:
      // 其他逻辑
      break;
  }

  /**
   * 获取页面标题
   */
  const getTitle = () => {
    let title = "";
    switch (type) {
      case "tags":
        title = t("postUnderTag", { tag: typeName });
        break;
      case "authors":
        title = t("postUnderAuthor", { author: typeName });
        break;
      default:
        if (typeName) {
          title = `${typeName}_${setting?.siteName?.[locale]}`;
        } else {
          title = setting?.siteName?.[locale];
        }
    }
    return decodeURI(title);
  };

  const title = getTitle();

  const openGraph = {
    title: title,
    type: "website",
    images: ["/static/images/logo.png"],
    description: setting?.siteSubName?.[locale],
  };

  return {
    title,
    description: setting?.siteSubName?.[locale],
    openGraph,
  };
}

export async function generateStaticParams() {
  return [];
}
