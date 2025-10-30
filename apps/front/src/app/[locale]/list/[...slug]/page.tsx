import React from "react";
import PostList from "@/components/PostList";
import NoData from "@/components/NoData";
import { getLocale, getTranslations } from "next-intl/server";
import { MultiLang } from "@honeycomb/types/multi.lang";
import { serverClient } from "@honeycomb/trpc/server";
import { PostStatus } from "@honeycomb/types/post/post.status";
import { PostListQueryInput } from "@honeycomb/validation/post/schemas/post.list.query.schema";

/**
 * 页面大小常量，用于分页查询。
 */
const PAGE_SIZE = 10;

/**
 * 列表页面组件的属性接口。
 */
export interface ListProps {
  /**
   * 包含 slug 数组和当前语言环境的 Promise。
   */
  params: Promise<{ slug: string[]; locale: keyof MultiLang }>;
}

/**
 * 列表页面组件。
 * 根据 URL 中的 slug 参数（如分类、标签、作者）显示相应的文章列表。
 * @param {ListProps} props - 组件属性。
 * @returns {Promise<JSX.Element>} 文章列表页面。
 */
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
    sortField: "createdAt",
  } as PostListQueryInput;
  let typeName = decodeURI(params?.slug?.pop() ?? "");
  switch (type) {
    case "category":
      // 获取分类ID
      const categoryId = menu?.list?.find((item) => item.path === typeName)?.id;
      if (typeof categoryId !== "undefined") {
        queryParams = { ...queryParams, categoryId: categoryId };
      }
      typeName =
        menu?.list?.find((item) => item.path === typeName)?.title?.[
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

  const post = await serverClient.post.index(queryParams);

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
          title = setting.siteName?.[params.locale] as string;
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
        <PostList initData={post} queryParams={queryParams} />
      ) : (
        <NoData title={t("emptyTip")} />
      )}
    </>
  );
}

/**
 * `generateMetadata` 函数的属性接口。
 */
type GenerateMetadataProps = {
  /**
   * 包含 slug 数组的 Promise。
   */
  params: Promise<{ slug: string[] }>;
  /**
   * 包含搜索参数的 Promise。
   */
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * 为列表页面生成元数据。
 * 用于设置页面的标题、描述、开放图谱等，以优化 SEO 和社交媒体分享。
 * @param {GenerateMetadataProps} props - 包含页面参数的属性。
 * @returns {Promise<Metadata>} 页面元数据。
 */
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
        menu?.list?.find((item) => item.path === typeName)?.title?.[locale] ||
        "";
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
          title = setting?.siteName?.[locale] as string;
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

/**
 * 生成静态页面参数。
 * 在构建时预渲染页面，提高性能。
 * @returns {Promise<any[]>} 静态参数数组。
 */
export async function generateStaticParams() {
  return [];
}
