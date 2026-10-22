import type { MediaRecord } from "@/features/media/types/media.record";
import type { TagRecord } from "@/features/tag/types/tag.record";
import "server-only";
import { parseEnumValue } from "@/lib/db/value-validation";
import { PostType } from "@/features/post/types/post.type";
import { EnableStatus } from "@/lib/validation/enable-status";

import { and, eq, inArray } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { TagType } from "@/features/tag/types/tag.type";
import { PostStatus } from "@/features/post/types/post.status";
import { observeDbOperation } from "@/lib/observability/server";
import type { PostWithRelations } from "@/features/post/types/post.read-model";
import type { PostVisibility } from "@/features/post/types/post.list-query";
import { groupPostTranslations } from "./post-translations";
import {
  assembleLocalizedField,
  assembleRequiredLocalizedField,
} from "@/lib/db/translation-values";
import {
  AdminPostListItemSchema,
  PublicPostListItemSchema,
} from "@/features/post/schemas/post.read-model.schema";
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
    [
      Key in keyof Pick<
        PostWithRelations,
        | "category"
        | "author"
        | "movieActors"
        | "movieDirectors"
        | "movieStyles"
        | "galleryStyles"
      >
    ]: Exclude<PostWithRelations[Key], undefined>;
  } & { cover?: typeof schema.media.$inferSelect | null },
): PostWithRelations {
  return {
    id: post.id,
    version: post.version,
    authorId: post.authorId,
    categoryId: post.categoryId,
    coverId: post.coverId,
    movieTime: post.movieTime,
    galleryTime: post.galleryTime,
    views: post.views,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
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
  posts: Pick<PostRecord, "id">[],
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
  // Metadata, translations and relations must come from the same query payload.
  return posts.flatMap((item) => {
    const row = relationMap.get(item.id);
    if (!row) return [];
    const {
      author,
      cover,
      translations,
      category,
      postTags: tags,
      ...currentPost
    } = row;
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
    const post = currentPost;
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

/** 在同一次已发布快照中读取卡片元数据、全部语言和封面。 */
export async function loadPublicPostListItems(
  db: Database,
  posts: Pick<PostRecord, "id">[],
) {
  const ids = [...new Set(posts.map((post) => post.id))];
  if (!ids.length) return [];
  const rows = await observeDbOperation(
    "post.service.relations",
    "select",
    () =>
      db.query.post.findMany({
        columns: { id: true, type: true, movieTime: true, updatedAt: true },
        where: and(
          inArray(schema.post.id, ids),
          eq(schema.post.status, PostStatus.PUBLISHED),
        ),
        with: {
          translations: {
            columns: {
              locale: true,
              title: true,
              excerpt: true,
              quoteContent: true,
              quoteAuthor: true,
            },
          },
          cover: { columns: { url: true, width: true, height: true } },
        },
      }),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return posts.flatMap(({ id }) => {
    const row = byId.get(id);
    // A row withdrawn or deleted since ID selection must not become a stale card.
    if (!row) return [];
    return [
      PublicPostListItemSchema.parse({
        id: row.id,
        type: row.type,
        movieTime: row.movieTime,
        updatedAt: row.updatedAt,
        title: assembleLocalizedField(
          row.translations,
          (translation) => translation.title,
        ),
        excerpt: assembleLocalizedField(
          row.translations,
          (translation) => translation.excerpt,
        ),
        quoteContent: assembleLocalizedField(
          row.translations,
          (translation) => translation.quoteContent,
        ),
        quoteAuthor: assembleLocalizedField(
          row.translations,
          (translation) => translation.quoteAuthor,
        ),
        cover: row.cover ?? undefined,
      }),
    ];
  });
}

/** 管理列表的元数据、标题、引用和展示关系来自同一次权限受限快照。 */
export async function loadAdminPostListItems(
  db: Database,
  posts: Pick<PostRecord, "id">[],
  visibility: PostVisibility,
) {
  const ids = [...new Set(posts.map((post) => post.id))];
  if (!ids.length) return [];
  const rows = await observeDbOperation(
    "post.service.relations",
    "select",
    () =>
      db.query.post.findMany({
        columns: {
          id: true,
          version: true,
          type: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          views: true,
        },
        where: and(
          inArray(schema.post.id, ids),
          visibility === "PUBLISHED_ONLY"
            ? eq(schema.post.status, PostStatus.PUBLISHED)
            : undefined,
        ),
        with: {
          translations: {
            columns: { locale: true, title: true, quoteContent: true },
          },
          category: {
            columns: { id: true },
            with: { translations: { columns: { locale: true, title: true } } },
          },
          author: { columns: { name: true } },
        },
      }),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return posts.flatMap(({ id }) => {
    const row = byId.get(id);
    if (!row) return [];
    return [
      AdminPostListItemSchema.parse({
        id: row.id,
        version: row.version,
        type: row.type,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        views: row.views,
        title: assembleLocalizedField(
          row.translations,
          (translation) => translation.title,
        ),
        quoteContent: assembleLocalizedField(
          row.translations,
          (translation) => translation.quoteContent,
        ),
        category: row.category
          ? {
              title: assembleRequiredLocalizedField(
                row.category.translations,
                (translation) => translation.title,
              ),
            }
          : undefined,
        author: row.author ? { name: row.author.name } : undefined,
      }),
    ];
  });
}
