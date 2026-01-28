"use client";

import Image from "next/image";
import useInfiniteQueryPostList from "@/app/(blog)/hooks/rq/post/use.infinite.query.post.list";
import { useScroll } from "ahooks";
import React, { JSX, useEffect, ViewTransition } from "react";
import { Link } from "@/app/(blog)/i18n/navigation";
import Signature from "../Signature";
import { utcFormat } from "@/app/(blog)/libs/utcFormat";
import { useLocale, useTranslations } from "next-intl";
import { MultiLang } from "@/packages/types/multi.lang";
import { Loader } from "lucide-react";
import { cn } from "@/packages/ui/lib/utils";
import { PostListItemEntity } from "@/packages/trpc/server/types/post.entity";
import { PostType, PostTypeName } from "@/packages/types/post/post.type";
import { PostListQueryInput } from "@/packages/validation/schemas/post/post.list.query.schema";
import { PostTypeBgColor } from "@/app/(blog)/types/PostTypeBgColor";

/**
 * 文章列表查询结果的输出类型。
 */
type PostIndexOutput = {
  /**
   * 文章实体列表。
   */
  list: PostListItemEntity[];
  /**
   * 文章总数。
   */
  total: number;
};

/**
 * 文章列表组件的属性接口。
 */
export interface PostListProps {
  /**
   * 查询文章列表的参数。
   */
  queryParams: PostListQueryInput;
  /**
   * 初始文章列表数据。
   */
  initData?: PostIndexOutput;
}

/**
 * 文章列表组件。
 * 用于展示文章列表，支持无限滚动加载更多文章。
 * @param {PostListProps} props - 组件属性。
 * @returns {JSX.Element} 文章列表。
 */
export default function PostList(props: PostListProps): JSX.Element {
  const { queryParams, initData } = props;
  const scroll = useScroll(typeof document !== "undefined" ? document : null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQueryPostList(queryParams, initData);
  const locale = useLocale() as keyof MultiLang;
  const t = useTranslations("PostList");

  const postList = data?.pages.flatMap((page) => page.list) ?? [];
  /**
   * 是否已加载所有文章。
   */
  const isEnd = !hasNextPage;
  /**
   * 是否正在加载更多文章。
   */
  const isLoadingMore = isFetchingNextPage;

  /**
   * 副作用钩子，用于实现无限滚动加载。
   * 当用户滚动到页面底部附近时，自动加载下一页文章。
   */
  useEffect(() => {
    if (typeof document !== "undefined" && !isLoadingMore && hasNextPage) {
      const { top = 0 } = scroll ?? {};
      const documentHeight = document.body.scrollHeight;
      const scrollTop = top + window.innerHeight;
      const difference = documentHeight - scrollTop;
      if (difference < 300) {
        fetchNextPage();
      }
    }
  }, [scroll, isLoadingMore, hasNextPage, fetchNextPage]);

  /**
   * 渲染文章列表中的单个卡片。
   * 根据文章类型显示不同的布局和内容。
   * @param {PostListItemEntity} item - 文章实体。
   * @returns {JSX.Element} 文章卡片。
   */
  const renderCard = (item: PostListItemEntity): JSX.Element => {
    return (
      <div className="bg-auto-back-gray/60" key={item.id}>
        {[PostType.ARTICLE, PostType.MOVIE, PostType.PHOTOGRAPH].includes(
          item.type as PostType,
        ) &&
          item.cover?.url && (
            <Link href={`/archives/${item.id}`} className="relative block">
              <ViewTransition name={`postContent-${item.id}`}>
                <Image
                  priority={true}
                  src={item.cover?.url ?? ""}
                  alt={item.title?.[locale] ?? ""}
                  width={item.cover.width!}
                  height={item.cover.height!}
                  sizes="
                    (max-width: 768px) 320px,
                    846px
                  "
                />
                <span
                  className={cn(
                    "absolute left-2 top-2 text-white text-sm rounded py-0.5 px-1",
                    [PostTypeBgColor[item.type as PostType]],
                  )}
                >
                  {PostTypeName[item.type as PostType]}
                </span>
              </ViewTransition>
            </Link>
          )}
        <div className="p-2 lg:px-4 flex-1">
          <ViewTransition name={`postTitle-${item.id}`}>
            <Link
              href={`/archives/${item.id}`}
              className="block font-normal text-lg lg:text-base"
            >
              {item.type === PostType.MOVIE && (
                <>
                  {item.title?.[locale]} ({utcFormat(item.movieTime!, "YYYY")})
                </>
              )}
              {[PostType.ARTICLE, PostType.PHOTOGRAPH].includes(
                item.type as PostType,
              ) && <>{item.title?.[locale]}</>}
              {item.type === PostType.QUOTE && (
                <>
                  “{item.quoteContent?.[locale]}” ——{" "}
                  {item.quoteAuthor?.[locale]}
                </>
              )}
            </Link>
          </ViewTransition>
          {item.excerpt?.[locale] && (
            <Link href={`/archives/${item.id}`}>
              <ViewTransition name={`postExcerpt-${item.id}`}>
                <div className="lg:my-1 lg:text-sm">
                  {item.excerpt?.[locale]}
                </div>
              </ViewTransition>
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {postList.map((item) => renderCard(item))}
      </div>
      {isEnd && <Signature text={t("listEnd")} />}
      {isLoadingMore && (
        <div className="mt-4 flex justify-center">
          <Loader className="animate-spin" />
        </div>
      )}
    </>
  );
}
