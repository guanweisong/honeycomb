import "server-only";
import { repositoryPaginationDefaults } from "@/packages/application/pagination";
import { ApplicationError } from "@/packages/application/errors";
import { parseEnumValue } from "@/packages/infrastructure/db/value-validation";
import { PostType } from "@/packages/domain/content/post";
import { EnableStatus } from "@/packages/domain/shared/enable-status";

import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { TagType } from "@/packages/domain/content/tag";
import { PostStatus } from "@/packages/domain/content/post-status";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { getLocalizedImageLinks } from "@/packages/infrastructure/content/parser/get-all-image-link-form-html";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type {
  PostQueryRepository,
  PostWithRelations,
  PostMediaRecord,
  PostAuthorRecord,
  PostCategoryRecord,
  PostTagRecord,
} from "../application/repository";
import { groupPostTranslations } from "./post-translations";
import {
  assembleRequiredLocalizedField,
} from "@/packages/infrastructure/db/translation-values";
export type {
  PostListInput,
  PostQueryRepository,
  PostVisibility,
  PostWithRelations,
} from "../application/repository";
type PostRecord = typeof schema.post.$inferSelect;
type PostTranslations = ReturnType<typeof groupPostTranslations> extends Map<
  string,
  infer Value
>
  ? Value
  : never;

function toMediaRecord(
  media: typeof schema.media.$inferSelect,
): PostMediaRecord {
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
    movieActors: PostTagRecord[];
    movieDirectors: PostTagRecord[];
    movieStyles: PostTagRecord[];
    galleryStyles: PostTagRecord[];
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
        where: inArray(schema.post.id, postIds),
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
  const translations = groupPostTranslations(rows.flatMap((row) => row.translations));
  const relationMap = new Map(rows.map((row) => [row.id, row]));
  return posts.map((item) => {
    const row = relationMap.get(item.id);
    const tags = row?.postTags ?? [];
    type RelatedTag = NonNullable<(typeof tags)[number]["tag"]>;
    const mapTags = (type: TagType) =>
      tags
        .filter((postTag) => postTag.type === type)
        .map((postTag) => postTag.tag)
        .filter((tag): tag is RelatedTag => Boolean(tag));
    const mapTag = (tag: RelatedTag): PostTagRecord => ({
      id: tag.id,
      name: assembleRequiredLocalizedField(tag.translations, (translation) => translation.name),
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    });
    const category = row?.category;
    const categoryTranslations = category
      ? {
          title: assembleRequiredLocalizedField(category.translations, (translation) => translation.title),
          description: assembleRequiredLocalizedField(
            category.translations,
            (translation) => translation.description,
          ),
        }
      : undefined;
    return toPostViewModel(item, translations.get(item.id), {
      category: category
        ? {
            id: category.id,
            title: categoryTranslations?.title ?? null,
            description: categoryTranslations?.description ?? null,
            parent: category.parent,
            status: category.status,
            path: category.path,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
          }
        : undefined,
      author: row?.author
        ? {
            id: row.author.id,
            name: row.author.name,
          }
        : null,
      cover: row?.cover,
      movieActors: mapTags(TagType.ACTOR).map(mapTag),
      movieDirectors: mapTags(TagType.DIRECTOR).map(mapTag),
      movieStyles: mapTags(TagType.MOVIE_STYLE).map(mapTag),
      galleryStyles: mapTags(TagType.GALLERY_STYLE).map(mapTag),
    });
  });
}

export function createPostQueryRepository(
  db: Database,
  dependencies: { loadRelations?: typeof loadPostRelations } = {},
): PostQueryRepository {
  const loadRelations = dependencies.loadRelations ?? loadPostRelations;
  return {
    async categoryFilter(categoryId) {
      const subCategories = await observeDbOperation(
        "post.service.category-tree",
        "select",
        () =>
          db.all<{ id: string }>(sql`with recursive descendants(id) as (
            select ${categoryId}
            union
            select c.id from category c join descendants d on c.parent = d.id
          ) select id from descendants`),
      );
      return subCategories.map((category) => category.id);
    },
    async list(input, visibility) {
      const {
        page = repositoryPaginationDefaults.page,
        limit = repositoryPaginationDefaults.limit,
        sortField,
        sortOrder,
        title,
        content,
        categoryId,
        tagId,
        authorId,
        ...rest
      } = input;
      let where = buildDrizzleWhere(
        schema.post,
        rest,
        ["status", "type"],
      );
      for (const [column, value] of [
        [schema.postTranslation.title, title],
        [schema.postTranslation.content, content],
      ] as const) {
        if (!value) continue;
        const match = sql`exists (
          select 1 from ${schema.postTranslation}
          where ${schema.postTranslation.postId} = ${schema.post.id}
            and ${column} like ${`%${value}%`}
        )`;
        where = where ? and(where, match) : match;
      }
      if (visibility === "PUBLISHED_ONLY") {
        const published = eq(schema.post.status, PostStatus.PUBLISHED);
        where = where ? and(where, published) : published;
      }
      if (categoryId) {
        const ids = await this.categoryFilter(categoryId);
        const clause = inArray(schema.post.categoryId, ids);
        where = where ? and(where, clause) : clause;
      }
      if (tagId) {
        const postIds = await observeDbOperation(
          "post.service.ids-by-tag",
          "select",
          () =>
            db
              .select({ postId: schema.postTag.postId })
              .from(schema.postTag)
              .where(eq(schema.postTag.tagId, tagId)),
        );
        const ids = postIds.map((post) => post.postId);
        if (!ids.length) return { list: [], total: 0 };
        const clause = inArray(schema.post.id, ids);
        where = where ? and(where, clause) : clause;
      }
      if (authorId) {
        const clause = eq(schema.post.authorId, authorId);
        where = where ? and(where, clause) : clause;
      }
      const order = buildDrizzleOrderBy(
        schema.post,
        sortField,
        sortOrder,
        repositoryPaginationDefaults.sortField,
      );
      const [list, countRows] = await Promise.all([
        observeDbOperation("post.service.list", "select", () =>
          db
            .select()
            .from(schema.post)
            .where(where)
            .orderBy(order)
            .limit(limit)
            .offset((page - 1) * limit),
        ),
        observeDbOperation("post.service.count", "select", () =>
          db
            .select({ count: sql<number>`count(*)`.as("count") })
            .from(schema.post)
            .where(where),
        ),
      ]);
      return {
        list: await loadRelations(db, list),
        total: Number(countRows[0]?.count) || 0,
      };
    },
    async detail(id, visibility) {
      const idFilter = eq(schema.post.id, id);
      const [item] = await observeDbOperation(
        "post.service.detail",
        "select",
        () =>
          db
            .select()
            .from(schema.post)
            .where(
              visibility === "ALL"
                ? idFilter
                : and(idFilter, eq(schema.post.status, PostStatus.PUBLISHED)),
            )
            .limit(1),
      );
      if (!item) return null;
      const [result] = await loadRelations(db, [item]);
      if (!result)
        throw new ApplicationError(
          "INTERNAL_SERVER_ERROR",
          "post detail relation mapping returned no record",
        );
      const urls = getLocalizedImageLinks(result.content);
      const imagesInContent = urls.length
        ? await observeDbOperation("post.service.detail-images", "select", () =>
            db
              .select()
              .from(schema.media)
              .where(inArray(schema.media.url, urls)),
          )
        : [];
      const uniqueImages = new Map(imagesInContent.map((image) => [image.url, image]));
      return { ...result, imagesInContent: [...uniqueImages.values()].map(toMediaRecord) };
    },
  };
}
