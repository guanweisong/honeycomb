import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";
import { PostType } from "@/packages/domain/content/post";
import { utcFormat } from "@/packages/ui/blog/utc-format";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";

export function assertPostDetail<T>(postDetail: T | null | undefined): T {
  if (!postDetail) {
    notFound();
  }

  return postDetail;
}

export function handlePostDetailError(error: unknown): never {
  if (error instanceof TRPCError && error.code === "NOT_FOUND") {
    notFound();
  }

  throw error;
}

type PostPresentation = {
  type: PostType | string;
  title?: Partial<Record<keyof MultiLang, string | null>> | null;
  quoteContent?: Partial<Record<keyof MultiLang, string | null>> | null;
  movieTime?: string | null;
  cover?: { url: string } | null;
  excerpt?: Partial<Record<keyof MultiLang, string | null>> | null;
};

/** 生成文章在页面标题和元数据中使用的本地化标题。 */
export function getPostTitle(
  post: PostPresentation,
  locale: keyof MultiLang,
): string | null | undefined {
  if (post.type === PostType.MOVIE) {
    const title = post.title?.[locale];
    return post.movieTime ? `${title ?? ""} (${utcFormat(post.movieTime, "YYYY")})` : title;
  }
  return post.title?.[locale] ?? post.quoteContent?.[locale];
}

/** 根据文章类型生成稳定的 JSON-LD 结构化数据。 */
export function createPostJsonLd(
  post: PostPresentation,
  locale: keyof MultiLang,
): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    name: getPostTitle(post, locale),
  };

  const typeMap: Partial<Record<string, string>> = {
    [PostType.ARTICLE]: "Article",
    [PostType.MOVIE]: "Movie",
    [PostType.PHOTOGRAPH]: "Photograph",
    [PostType.QUOTE]: "Quotation",
  };
  jsonLd["@type"] = typeMap[post.type];
  if (post.type !== PostType.QUOTE) {
    jsonLd.image = post.cover?.url;
    jsonLd.description = post.excerpt?.[locale];
  }
  return jsonLd;
}
