"use client";

import Image from "next/image";
import useInfiniteQueryPostList from "@/features/post/public/use-post-list";
import React, { JSX, useEffect, useRef, ViewTransition } from "react";
import { Link } from "@/lib/i18n/blog-navigation";
import Signature from "@/components/blog/Signature";
import { utcFormat } from "@/lib/ui/utc-format";
import { useLocale, useTranslations } from "next-intl";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import { cn } from "@/lib/ui/utils";
import LoadingState from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import type { PublicPostListItem as PostListItemEntity } from "@/features/post/types";
import { PostType } from "@/features/post/post-type";
import { PostTypeName } from "@/features/post/admin/options";
import { PostListQueryInput } from "@/features/post/schema";
import type { PublicPostListResult } from "@/features/post/types";

const PostTypeBgColor = Object.freeze({
  [PostType.ARTICLE]: "bg-green-600",
  [PostType.MOVIE]: "bg-orange-600",
  [PostType.PHOTOGRAPH]: "bg-purple-600",
  [PostType.QUOTE]: "bg-blue-600",
} as const);

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
  initData?: PublicPostListResult;
}

/**
 * 文章列表组件。
 * 用于展示文章列表，支持无限滚动加载更多文章。
 * @param {PostListProps} props - 组件属性。
 * @returns {JSX.Element} 文章列表。
 */
export default function PostList(props: PostListProps): JSX.Element {
  const { queryParams, initData } = props;
  const sentinel = useRef<HTMLDivElement>(null);
  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isError,
    isFetchNextPageError,
  } = useInfiniteQueryPostList(queryParams, initData);
  const locale = normalizeMultiLangLocale(useLocale());
  const t = useTranslations("PostList");
  const errorTranslations = useTranslations("Error");

  const postList = data?.pages.flatMap((page) => page?.list ?? []) ?? [];
  /**
   * 是否已加载所有文章。
   */
  const isEnd = !hasNextPage && !isError && !isFetching;
  /**
   * 是否正在加载更多文章。
   */
  const isLoadingMore = isFetchingNextPage;

  // 只观察列表末尾，避免每个滚动事件都触发列表渲染或读取文档布局。
  useEffect(() => {
    if (!sentinel.current || isFetching || isError || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchNextPage({ cancelRefetch: false });
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [isFetching, isError, hasNextPage, fetchNextPage]);

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
      <div ref={sentinel} data-testid="post-list-sentinel" aria-hidden="true" />
      {isError && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p role="alert">{errorTranslations("title")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={isFetching}
            onClick={() => {
              if (isFetchNextPageError) {
                void fetchNextPage({ cancelRefetch: false });
              } else {
                void refetch();
              }
            }}
          >
            {errorTranslations("tryAgain")}
          </Button>
        </div>
      )}
      {isEnd && <Signature text={t("listEnd")} />}
      {isLoadingMore && (
        <div className="mt-4 flex justify-center">
          <LoadingState
            variant="inline"
            label={t("loadingMore")}
            visuallyHiddenLabel
          />
        </div>
      )}
    </>
  );
}
