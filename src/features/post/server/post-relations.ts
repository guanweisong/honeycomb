import type { MediaRecord } from "@/features/media/types";
import type { TagRecord } from "@/features/tag/types";
import "server-only";
import { parseEnumValue } from "@/lib/db/value-validation";
import { PostType } from "@/features/post/post-type";
import { EnableStatus } from "@/lib/validation/enable-status";

import { and, eq, inArray } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { TagType } from "@/features/tag/tag-kind";
import { PostStatus } from "@/features/post/post-status";
import { observeDbOperation } from "@/lib/observability/server";
import type {
  PostWithRelations,
  PostAuthorRecord,
  PostCategoryRecord,
  PostVisibility,
} from "../types";
import { groupPostTranslations } from "./post-translations";
import { assembleRequiredLocalizedField } from "@/lib/db/translation-values";
type PostRecord = typeof schema.post.$inferSelect;
type PostTranslations =
  ReturnType<typeof groupPostTranslations> extends Map<string, infer Value>
    ? Value
    : never;

export function toMediaRecord(
  media: typeof schema.media.$inferSelect,
): MediaRecord {
  return {
    id: media.id,
    key: media.key,
    name: media.name,
    size: media.size,
    type: media.type,
    url: media.url,
    color: media.color,
    height: media.height,
    width: media.width,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
  };
}

function toPostViewModel(
  post: PostRecord,
  translations: PostTranslations | undefined,
  relations: {
    category?: PostCategoryRecord | null;
    author?: PostAuthorRecord | null;
    cover?: typeof schema.media.$inferSelect | null;
    movieActors: TagRecord[];
    movieDirectors: TagRecord[];
    movieStyles: TagRecord[];
    galleryStyles: TagRecord[];
  },
): PostWithRelations {
  return {
    ...post,
    title: translations?.title ?? null,
    content: translations?.content ?? null,
    excerpt: translations?.excerpt ?? null,
    galleryLocation: translations?.galleryLocation ?? null,
    quoteAuthor: translations?.quoteAuthor ?? null,
    quoteContent: translations?.quoteContent ?? null,
    status: parseEnumValue(
      post.status,
      Object.values(PostStatus),
      "post.status",
    ),
    type: parseEnumValue(post.type, Object.values(PostType), "post.type"),
    commentStatus: parseEnumValue(
      post.commentStatus,
      Object.values(EnableStatus),
      "post.commentStatus",
    ),
    category: relations.category ?? undefined,
    author: relations.author ?? undefined,
    cover: relations.cover ? toMediaRecord(relations.cover) : undefined,
    movieActors: relations.movieActors,
    movieDirectors: relations.movieDirectors,
    movieStyles: relations.movieStyles,
    galleryStyles: relations.galleryStyles,
  };
}
export async function loadPostRelations(
  db: Database,
  posts: PostRecord[],
  visibility: PostVisibility = "ALL",
): Promise<PostWithRelations[]> {
  const postIds = Array.from(
    new Set(posts.map((post) => post.id).filter(Boolean)),
  );
  if (!postIds.length) return [];
  const rows = await observeDbOperation(
    "post.service.relations",
    "select",
    () =>
      db.query.post.findMany({
        where: and(
          inArray(schema.post.id, postIds),
          visibility === "PUBLISHED_ONLY"
            ? eq(schema.post.status, PostStatus.PUBLISHED)
            : undefined,
        ),
        with: {
          author: {
            columns: {
              id: true,
              name: true,
            },
          },
          cover: true,
          translations: true,
          category: { with: { translations: true } },
          postTags: { with: { tag: { with: { translations: true } } } },
        },
      }),
  );
  const relationMap = new Map(rows.map((row) => [row.id, row]));
  const visiblePosts =
    visibility === "PUBLISHED_ONLY"
      ? posts.filter((post) => relationMap.has(post.id))
      : posts;
  return visiblePosts.map((item) => {
    const row = relationMap.get(item.id);
    const {
      author,
      cover,
      translations,
      category,
      postTags: tags,
      ...currentPost
    } = row ?? {
      ...item,
      author: null,
      cover: null,
      translations: [],
      category: null,
      postTags: [],
    };
    type RelatedTag = NonNullable<(typeof tags)[number]["tag"]>;
    const mapTags = (type: TagType) =>
      tags
        .filter((postTag) => postTag.type === type)
        .map((postTag) => postTag.tag)
        .filter((tag): tag is RelatedTag => Boolean(tag));
    const mapTag = (tag: RelatedTag): TagRecord => ({
      id: tag.id,
      name: assembleRequiredLocalizedField(
        tag.translations,
        (translation) => translation.name,
      ),
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    });
    const categoryTranslations = category
      ? {
          title: assembleRequiredLocalizedField(
            category.translations,
            (translation) => translation.title,
          ),
          description: assembleRequiredLocalizedField(
            category.translations,
            (translation) => translation.description,
          ),
        }
      : undefined;
    // Published metadata and translations must come from the same payload read.
    const post = visibility === "PUBLISHED_ONLY" ? currentPost : item;
    const localized = groupPostTranslations(translations).get(item.id);
    return toPostViewModel(post, localized, {
      category: category
        ? {
            id: category.id,
            title: categoryTranslations?.title ?? null,
            description: categoryTranslations?.description ?? null,
            parent: category.parent,
            status: parseEnumValue(
              category.status,
              Object.values(EnableStatus),
              "category.status",
            ),
            path: category.path,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
          }
        : undefined,
      author: author
        ? {
            id: author.id,
            name: author.name,
          }
        : null,
      cover,
      movieActors: mapTags(TagType.ACTOR).map(mapTag),
      movieDirectors: mapTags(TagType.DIRECTOR).map(mapTag),
      movieStyles: mapTags(TagType.MOVIE_STYLE).map(mapTag),
      galleryStyles: mapTags(TagType.GALLERY_STYLE).map(mapTag),
    });
  });
}
