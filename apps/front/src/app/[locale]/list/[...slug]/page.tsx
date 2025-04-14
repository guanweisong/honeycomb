import React from "react";
import { PostStatus } from "@/src/types/post/PostStatus";
import { PostListQuery } from "@/src/types/post/post.list.query";
import { MenuEntity } from "@/src/types/menu/menu.entity";
import PostServer from "@/src/services/post";
import MenuServer from "@/src/services/menu";
import SettingServer from "@/src/services/setting";
import PostList from "@/src/components/PostList";
import NoData from "@/src/components/NoData";
import { getLocale, getTranslations } from "next-intl/server";
import { MultiLang } from "@/src/types/Language";

const PAGE_SIZE = 10;

export interface ListProps {
  params: Promise<{ slug: string[]; locale: keyof MultiLang }>;
}

export default async function List(props: ListProps) {
  const [setting, menu] = await Promise.all([
    SettingServer.indexSetting(),
    MenuServer.indexMenu(),
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
      const categoryId = menu?.find(
        (item: MenuEntity) => item.path === typeName,
      )?.id;
      if (typeof categoryId !== "undefined") {
        queryParams = { ...queryParams, categoryId: categoryId };
      }
      typeName =
        menu?.find((item: MenuEntity) => item.path === typeName)?.title?.[
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
  // 获取分类列表
  const postList = await PostServer.indexPostList(queryParams);

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
      {postList.length > 0 ? (
        <PostList
          initData={postList}
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
    SettingServer.indexSetting(),
    MenuServer.indexMenu(),
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
        menu?.find((item: MenuEntity) => item.path === typeName)?.title?.[
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
