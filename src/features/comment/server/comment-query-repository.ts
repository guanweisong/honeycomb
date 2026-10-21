import type { CommentListInput, CommentRefInput } from "../types";
import "server-only";
import { CommentStatus } from "@/features/comment/comment-status";
import { PostStatus } from "@/features/post/post-status";
import { PageStatus } from "@/features/page/page-status";
import { MenuType } from "@/features/menu/menu-types";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { toCommentRecord, toPublicCommentSource } from "./comment-dto";
import { buildPublicCommentTree, toPublicComment } from "./comment-public-dto";

import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { observeDbOperation } from "@/lib/observability/server";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/lib/db/query/query-builders";
import { assembleLocalizedField } from "@/lib/db/translation-values";
import type { MultiLangEnum } from "@/lib/i18n/i18n";

import type { CommentListItem, CommentRelatedRecord } from "../types";

function toRelatedRecord(
  record: {
    id: string;
    translations: Array<{ locale: MultiLangEnum; title: string | null }>;
  } | null,
): CommentRelatedRecord | null {
  return record
    ? {
        id: record.id,
        title: assembleLocalizedField(record.translations, (row) => row.title),
      }
    : null;
}

export function createCommentQueryRepository(db: Database) {
  return {
    async list(
      input: CommentListInput,
      visibility: "ALL" | "PUBLISHED_ONLY" = "ALL",
    ) {
      const {
        page = repositoryPaginationDefaults.page,
        limit = repositoryPaginationDefaults.limit,
        sortField,
        sortOrder,
        ...rest
      } = input;
      let where = buildDrizzleWhere(schema.comment, rest, ["status"]);
      if (visibility === "PUBLISHED_ONLY") {
        const publishedPosts = db
          .select({ id: schema.post.id })
          .from(schema.post)
          .where(eq(schema.post.status, PostStatus.PUBLISHED));
        const publishedPages = db
          .select({ id: schema.page.id })
          .from(schema.page)
          .where(eq(schema.page.status, PageStatus.PUBLISHED));
        // 先限制目标再分页和计数，避免通过评论、标题或总数读取未发布内容。
        where = and(
          where,
          or(
            inArray(schema.comment.postId, publishedPosts),
            inArray(schema.comment.pageId, publishedPages),
            inArray(schema.comment.customId, publishedPosts),
          ),
        );
      }
      const orderBy = buildDrizzleOrderBy(
        schema.comment,
        sortField,
        sortOrder,
        repositoryPaginationDefaults.sortField,
      );
      const [commentIds, countRows] = await Promise.all([
        observeDbOperation("comment.service.ids", "select", () =>
          db
            .select({ id: schema.comment.id })
            .from(schema.comment)
            .where(where)
            .orderBy(orderBy)
            .limit(limit)
            .offset((page - 1) * limit),
        ),
        observeDbOperation("comment.service.count", "select", () =>
          db
            .select({ count: sql<number>`count(*)`.as("count") })
            .from(schema.comment)
            .where(where),
        ),
      ]);
      const ids = commentIds.map(({ id }) => id);
      const comments = ids.length
        ? await observeDbOperation("comment.service.list", "select", () =>
            db.query.comment.findMany({
              where:
                visibility === "PUBLISHED_ONLY"
                  ? and(inArray(schema.comment.id, ids), where)
                  : inArray(schema.comment.id, ids),
              with: {
                post: {
                  columns: { id: true },
                  with: {
                    translations: { columns: { locale: true, title: true } },
                  },
                },
                page: {
                  columns: { id: true },
                  with: {
                    translations: { columns: { locale: true, title: true } },
                  },
                },
              },
            }),
          )
        : [];
      const order = new Map(ids.map((id, index) => [id, index]));
      const ordered = comments.sort(
        (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
      );
      const customIds = Array.from(
        new Set(
          ordered
            .map(({ customId }) => customId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      const customPosts = customIds.length
        ? await observeDbOperation(
            "comment.service.custom-posts",
            "select",
            () =>
              db.query.post.findMany({
                columns: { id: true },
                where:
                  visibility === "PUBLISHED_ONLY"
                    ? and(
                        inArray(schema.post.id, customIds),
                        eq(schema.post.status, PostStatus.PUBLISHED),
                      )
                    : inArray(schema.post.id, customIds),
                with: {
                  translations: { columns: { locale: true, title: true } },
                },
              }),
          )
        : [];
      const customPostMap = Object.fromEntries(
        customPosts.map((post) => [post.id, post]),
      );
      const list: CommentListItem[] = ordered.map((comment) => ({
        ...toCommentRecord(comment),
        post: toRelatedRecord(comment.post),
        page: toRelatedRecord(comment.page),
        custom: toRelatedRecord(
          comment.customId ? (customPostMap[comment.customId] ?? null) : null,
        ),
      }));
      return { list, total: Number(countRows[0]?.count) || 0 };
    },
    async listPublicByRef(input: CommentRefInput) {
      let where: SQL | undefined = inArray(schema.comment.status, [
        CommentStatus.PUBLISH,
        CommentStatus.BAN,
      ]);
      if (input.type === MenuType.CATEGORY)
        where = and(where, eq(schema.comment.postId, input.id));
      else if (input.type === MenuType.PAGE)
        where = and(where, eq(schema.comment.pageId, input.id));
      else where = and(where, eq(schema.comment.customId, input.id));
      const result = await observeDbOperation(
        "comment.service.public-list",
        "select",
        () =>
          db.query.comment.findMany({
            columns: {
              id: true,
              author: true,
              content: true,
              site: true,
              email: true,
              parentId: true,
              status: true,
              createdAt: true,
            },
            where,
            orderBy: [asc(schema.comment.createdAt), desc(schema.comment.id)],
          }),
      );
      const list = buildPublicCommentTree(
        result.map(toPublicCommentSource).map(toPublicComment),
      );
      // 此查询不分页；计数保留建树前的屏蔽评论与孤儿回复。
      return { list, total: result.length };
    },
  };
}

export type CommentQueryRepository = ReturnType<
  typeof createCommentQueryRepository
>;
