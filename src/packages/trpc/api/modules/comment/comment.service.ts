import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  sql,
  type InferInsertModel,
  type SQL,
} from "drizzle-orm";
import listToTree from "list-to-tree-lite";
import type { z } from "zod";
import type { Database } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import type { CommentListQuerySchema } from "./schemas/comment.list.query.schema";
import type { CommentInsertInput } from "./schemas/comment.insert.schema";
import type { CommentUpdate } from "./schemas/comment.update.schema";
import type { CommentQuerySchema } from "./schemas/comment.query.schema";
import type { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/api/utils/tools";
import { validateCaptcha } from "@/packages/trpc/api/utils/validateCaptcha";
import { CommentStatus } from "./types/comment.status";
import {
  assertCommentParentMatches,
  assertPublicCommentTarget,
} from "./comment-target.service";
import { notifyCommentCreated } from "./comment-notification.service";
import { toPublicComment } from "./comment.dto";

type CommentListInput = z.infer<typeof CommentListQuerySchema>;
type DeleteBatchInput = z.infer<typeof DeleteBatchSchema>;
type CommentRefInput = z.infer<typeof CommentQuerySchema> & { id: string };

export async function listComments(db: Database, input: CommentListInput) {
  const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
  const where = buildDrizzleWhere(schema.comment, rest, ["status"]);
  const orderBy = buildDrizzleOrderBy(
    schema.comment,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );
  const commentIds = await db
    .select({ id: schema.comment.id })
    .from(schema.comment)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset((page - 1) * limit);
  const ids = commentIds.map(({ id }) => id);
  const comments = ids.length
    ? await db.query.comment.findMany({
        where: inArray(schema.comment.id, ids),
        with: { post: true, page: true },
      })
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
    ? await db
        .select()
        .from(schema.post)
        .where(inArray(schema.post.id, customIds))
    : [];
  const customPostMap = Object.fromEntries(
    customPosts.map((post) => [post.id, post]),
  );
  const [countResult] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(schema.comment)
    .where(where);

  return {
    list: ordered.map((comment) => ({
      ...comment,
      custom: comment.customId
        ? (customPostMap[comment.customId] ?? null)
        : null,
    })),
    total: Number(countResult?.count) || 0,
  };
}

export async function listPublicCommentsByRef(
  db: Database,
  input: CommentRefInput,
) {
  await assertPublicCommentTarget(db, {
    postId: input.type === "CATEGORY" ? input.id : undefined,
    pageId: input.type === "PAGE" ? input.id : undefined,
    customId: input.type === "CUSTOM" ? input.id : undefined,
  });
  let where: SQL | undefined = inArray(schema.comment.status, [
    "PUBLISH",
    "BAN",
  ] as const);
  if (input.type === "CATEGORY") {
    where = and(where, eq(schema.comment.postId, input.id));
  } else if (input.type === "PAGE") {
    where = and(where, eq(schema.comment.pageId, input.id));
  } else {
    where = and(where, eq(schema.comment.customId, input.id));
  }
  const result = await db.query.comment.findMany({
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
  });
  const list = result.length
    ? listToTree(result.map(toPublicComment), {
        idKey: "id",
        parentKey: "parentId",
      })
    : [];
  const [countResult] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(schema.comment)
    .where(where);
  return { list, total: Number(countResult?.count) || 0 };
}

export async function createComment(
  db: Database,
  headers: Headers,
  input: CommentInsertInput,
) {
  const { captchaToken, ...comment } = input;
  await validateCaptcha(captchaToken);
  await assertPublicCommentTarget(db, comment);
  if (comment.parentId) {
    await assertCommentParentMatches(db, comment.parentId, comment);
  }
  const [created] = await db
    .insert(schema.comment)
    .values({
      ...comment,
      ip: headers.get("x-forwarded-for") ?? null,
      userAgent: headers.get("user-agent") ?? null,
      status: CommentStatus.PUBLISH,
    })
    .returning();
  const currentComment = await notifyCommentCreated(
    db,
    created.id,
    comment.parentId,
  );
  return toPublicComment(currentComment);
}

export async function updateComment(db: Database, input: CommentUpdate) {
  const { id, ...changes } = input;
  const [updated] = await db
    .update(schema.comment)
    .set(changes as Partial<InferInsertModel<typeof schema.comment>>)
    .where(eq(schema.comment.id, id))
    .returning();
  return updated;
}

export async function destroyComments(db: Database, input: DeleteBatchInput) {
  await db.delete(schema.comment).where(inArray(schema.comment.id, input.ids));
  return { success: true };
}
