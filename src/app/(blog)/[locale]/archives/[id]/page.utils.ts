import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";
import { PostType } from "@/features/post/types/post.type";
import { utcFormat } from "@/lib/ui/utc-format";
import type { MultiLang } from "@/lib/i18n/multi-lang";
import type { NullableLocalizedInput } from "@/lib/i18n/i18n";
import type { PostWithRelations } from "@/features/post/types/post.read-model";

export function assertPostDetail<T>(postDetail: T | null | undefined): T {
  if (!postDetail) {
    notFound();
  }

  return postDetail;
}

export function assertPostCategory(postDetail: {
  id: string;
  category?: { id: string } | null;
}) {
  if (!postDetail.category) {
    throw new Error(`Post ${postDetail.id} is missing category relation`);
  }
  return postDetail.category;
}

export function handlePostDetailError(error: unknown): never {
  if (error instanceof TRPCError && error.code === "NOT_FOUND") {
    notFound();
  }

  throw error;
}

type PostPresentation = {
  // 展示兼容边界仍接受未知文章类型，不把外部字符串收紧成枚举。
  type: PostWithRelations["type"] | string;
  movieTime?: PostWithRelations["movieTime"];
  cover?: Pick<NonNullable<PostWithRelations["cover"]>, "url"> | null;
} & Partial<
  Record<
    "title" | "quoteContent" | "excerpt",
    // 可缺少语言键，但保留 exactOptionalPropertyTypes 下不接受显式 undefined。
    | {
        [Language in keyof NonNullable<NullableLocalizedInput>]?: Exclude<
          NonNullable<NullableLocalizedInput>[Language],
          undefined
        >;
      }
    | null
  >
>;

/** 生成文章在页面标题和元数据中使用的本地化标题。 */
export function getPostTitle(
  post: PostPresentation,
  locale: keyof MultiLang,
): string | null | undefined {
  if (post.type === PostType.MOVIE) {
    const title = post.title?.[locale];
    return post.movieTime
      ? `${title ?? ""} (${utcFormat(post.movieTime, "YYYY")})`
      : title;
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
