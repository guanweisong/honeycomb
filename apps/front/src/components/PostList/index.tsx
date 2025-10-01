"use client";

import Image from "next/image";
import useInfiniteQueryPostList from "@/hooks/rq/post/use.infinite.query.post.list";
import { useScroll } from "ahooks";
import React, {
  useEffect,
  unstable_ViewTransition as ViewTransition,
} from "react";
import { Link } from "@/i18n/navigation";
import PostInfo, { Align } from "@/components/PostInfo";
import Signature from "@/components/Signature";
import { utcFormat } from "@/utils/utcFormat";
import { useLocale, useTranslations } from "next-intl";
import { MultiLang } from "@/types/Language";
import { Loader } from "lucide-react";
import { cn } from "@honeycomb/ui/lib/utils";
import { PostEntity } from "@honeycomb/validation/post/schemas/post.entity.schema";
import { PostType, PostTypeBgColor, PostTypeName } from "@honeycomb/db";
import { PostListQueryInput } from "@honeycomb/validation/post/schemas/post.list.query.schema";

export interface PostListProps {
  queryParams: PostListQueryInput;
}

export default function PostList(props: PostListProps) {
  const { queryParams } = props;
  const scroll = useScroll(typeof document !== "undefined" ? document : null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQueryPostList(queryParams);
  const locale = useLocale() as keyof MultiLang;
  const t = useTranslations("PostList");

  const postList = data?.pages.flatMap((page) => page.list) ?? [];
  const isEnd = !hasNextPage;
  const isLoadingMore = isFetchingNextPage;

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
   * 渲染列表卡片
   * @param item
   */
  const renderCard = (item: PostEntity) => {
    return (
      <div
        className="mt-6 first:mt-2 lg:flex bg-auto-back-gray/60"
        key={item.id}
      >
        {[PostType.ARTICLE, PostType.MOVIE, PostType.PHOTOGRAPH].includes(
          item.type,
        ) &&
          item.cover?.url && (
            <Link
              href={`/archives/${item.id}`}
              className="relative block lg:w-[250px] w-full lg:h-[150px] h-[200px]"
            >
              <ViewTransition name={`postContent-${item.id}`}>
                <Image
                  priority={true}
                  src={item.cover?.url ?? ""}
                  alt={item.title?.[locale] ?? ""}
                  fill={true}
                  className="object-cover flex-shrink-0"
                />
                <span
                  className={cn(
                    "absolute left-2 top-2 text-white text-base rounded py-0.5 px-1",
                    [PostTypeBgColor[item.type]],
                  )}
                >
                  {PostTypeName[item.type]}
                </span>
              </ViewTransition>
            </Link>
          )}
        <div className="p-2 lg:px-4 flex-1">
          <ViewTransition name={`postTitle-${item.id}`}>
            <Link
              href={`/archives/${item.id}`}
              className="block font-normal text-lg"
            >
              {item.type === PostType.MOVIE && (
                <>
                  {item.title?.[locale]} ({utcFormat(item.movieTime!, "YYYY")})
                </>
              )}
              {[PostType.ARTICLE, PostType.PHOTOGRAPH].includes(item.type) && (
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
            <ViewTransition name={`postExcerpt-${item.id}`}>
              <div className="lg:my-2 lg:line-clamp-2">
                {item.excerpt?.[locale]}
              </div>
            </ViewTransition>
          )}
          <PostInfo
            id={item.id}
            author={item.author.name}
            date={item.createdAt}
            comments={item.commentCount}
            views={item.views}
            align={Align.Left}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <div>{postList.map((item) => renderCard(item))}</div>
      {isEnd && <Signature text={t("listEnd")} />}
      {isLoadingMore && (
        <div className="mt-4 flex justify-center">
          <Loader className="animate-spin" />
        </div>
      )}
    </>
  );
}
