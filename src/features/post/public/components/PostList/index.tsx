"use client";

import Image from "next/image";
import useInfiniteQueryPostList from "@/features/post/public/hooks/rq/post/use.infinite.query.post.list";
import React, { JSX, useEffect, ViewTransition } from "react";
import { Link } from "@/packages/ui/navigation/blog-navigation";
import Signature from "@/packages/ui/blog/Signature";
import { utcFormat } from "@/packages/ui/blog/utc-format";
import { useLocale, useTranslations } from "next-intl";
import { normalizeMultiLangLocale } from "@/packages/domain/localization/multi-lang";
import { Loader } from "lucide-react";
import { cn } from "@/packages/ui/lib/utils";
import type { PostListViewModel as PostListItemEntity } from "../../../presentation/post-view-model";
import { PostType, PostTypeName } from "@/packages/domain/content/post";
import { PostListQueryInput } from "@/features/post/schemas/post.list.query.schema";
import { PostTypeBgColor } from "@/features/post/public/types-post-type-bg-color";
import { useScrollPosition } from "@/packages/ui/hooks/use-scroll-position";

/**
 * 文章列表查询结果的输出类型。
 */
type PostIndexOutput =
  import("@/features/post/application/repository").PostListResult;

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
  const { top: scrollTop } = useScrollPosition();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQueryPostList(queryParams, initData);
  const locale = normalizeMultiLangLocale(useLocale());
  const t = useTranslations("PostList");

  const postList = data?.pages.flatMap((page) => page?.list ?? []) ?? [];
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
      const documentHeight = document.body.scrollHeight;
      const viewportBottom = scrollTop + window.innerHeight;
      const difference = documentHeight - viewportBottom;
      if (difference < 300) {
        fetchNextPage();
      }
    }
  }, [scrollTop, isLoadingMore, hasNextPage, fetchNextPage]);

  /**
   * 渲染文章列表中的单个卡片。
   * 根据文章类型显示不同的布局和内容。
   * @param {PostListItemEntity} item - 文章实体。
   * @param {number} index - 文章在列表中的索引。
   * @returns {JSX.Element} 文章卡片。
   */
  const renderCard = (item: PostListItemEntity, index: number): JSX.Element => {
    const isFirstItem = index === 0;
    const postType = Object.values(PostType).find((type) => type === item.type);
    return (
      <div className="bg-auto-back-gray/60" key={item.id}>
        {postType !== undefined &&
          postType !== PostType.QUOTE &&
          item.cover?.url &&
          item.cover.width != null &&
          item.cover.height != null && (
            <Link href={`/archives/${item.id}`} className="relative block">
              <ViewTransition name={`postContent-${item.id}`}>
                <Image
                  priority={isFirstItem}
                  src={item.cover?.url ?? ""}
                  alt={item.title?.[locale] ?? ""}
                  width={item.cover.width}
                  height={item.cover.height}
                  sizes="(max-width: 768px) 320px, 846px"
                />
                <span
                  className={cn(
                    "absolute left-2 top-2 text-white text-sm rounded py-0.5 px-1",
                    [PostTypeBgColor[postType]],
                  )}
                >
                  {PostTypeName[postType]}
                </span>
              </ViewTransition>
            </Link>
          )}
        <div className="p-2 lg:px-4 flex-1">
          <ViewTransition name={`postTitle-${item.id}`}>
            <Link
              href={`/archives/${item.id}`}
              className="block text-lg lg:text-base"
            >
              {item.type === PostType.MOVIE && (
                <>
                  {item.title?.[locale]}
                  {item.movieTime
                    ? ` (${utcFormat(item.movieTime, "YYYY")})`
                    : ""}
                </>
              )}
              {(item.type === PostType.ARTICLE ||
                item.type === PostType.PHOTOGRAPH) && (
                <>{item.title?.[locale]}</>
              )}
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
        {postList.map((item, index) => renderCard(item, index))}
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
