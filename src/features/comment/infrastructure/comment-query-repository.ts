import "server-only";
import { CommentStatus } from "@/packages/domain/content/comment";
import { MenuType } from "@/packages/domain/navigation/menu";
import { repositoryPaginationDefaults } from "@/packages/application/pagination";
import { toCommentRecord, toPublicCommentSource } from "./comment-dto";
import {
  buildPublicCommentTree,
  toPublicComment,
} from "../application/comment-public-dto";

import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { assembleLocalizedField } from "@/packages/infrastructure/db/translation-values";
import type { MultiLangEnum } from "@/packages/domain/localization/i18n";

import type {
  CommentQueryRepository,
  CommentListItem,
  CommentRelatedRecord,
} from "../application/repository";
export type {
  CommentListInput,
  CommentQueryRepository,
  CommentRefInput,
} from "../application/repository";
export type {
  CommentListItem,
  PublicCommentNode,
} from "../application/repository";

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

export function createCommentQueryRepository(
  db: Database,
): CommentQueryRepository {
  return {
    async list(input) {
      const {
        page = repositoryPaginationDefaults.page,
        limit = repositoryPaginationDefaults.limit,
        sortField,
        sortOrder,
        ...rest
      } = input;
      const where = buildDrizzleWhere(schema.comment, rest, ["status"]);
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
              where: inArray(schema.comment.id, ids),
              with: {
                post: { with: { translations: true } },
                page: { with: { translations: true } },
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
                where: inArray(schema.post.id, customIds),
                with: { translations: true },
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
    async listPublicByRef(input) {
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
      const [countResult] = await observeDbOperation(
        "comment.service.public-count",
        "select",
        () =>
          db
            .select({ count: sql<number>`count(*)`.as("count") })
            .from(schema.comment)
            .where(where),
      );
      return { list, total: Number(countResult?.count) || 0 };
    },
  };
}
