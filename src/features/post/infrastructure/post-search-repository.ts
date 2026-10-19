import "server-only";

import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { Parser } from "htmlparser2";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";
import type { Database } from "@/packages/infrastructure/db/db";
import { post, postTranslation } from "@/packages/infrastructure/db/schema";
import { parseEnumValue } from "@/packages/infrastructure/db/value-validation";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type {
  PostSearchInput,
  PostSearchResult,
} from "../application/post-search";

const textBoundary = new Set([
  "p",
  "div",
  "br",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "tr",
  "td",
  "hr",
]);
const hiddenElements = new Set(["script", "style", "template"]);

function plainTextExcerpt(html: string | null): string {
  const parts: string[] = [];
  let hiddenDepth = 0;
  const parser = new Parser(
    {
      onopentag(name) {
        if (hiddenElements.has(name)) hiddenDepth++;
        if (!hiddenDepth && textBoundary.has(name)) parts.push(" ");
      },
      ontext(text) {
        if (!hiddenDepth) parts.push(text);
      },
      onclosetag(name) {
        if (hiddenElements.has(name)) hiddenDepth--;
        if (!hiddenDepth && textBoundary.has(name)) parts.push(" ");
      },
    },
    { decodeEntities: true },
  );
  parser.end(html ?? "");
  const text = parts.join("").replace(/\s+/g, " ").trim();
  const characters = Array.from(text);
  return characters.length > 160
    ? `${characters.slice(0, 159).join("")}…`
    : text;
}

/** Search is public regardless of caller identity; SQL values remain parameterized. */
export async function searchPublishedPosts(
  db: Database,
  input: PostSearchInput,
): Promise<PostSearchResult[]> {
  const pattern = `%${input.query.replace(/[\\%_]/g, "\\$&")}%`;
  const body = sql<string | null>`case
    when ${post.type} = ${PostType.QUOTE} then ${postTranslation.quoteContent}
    else ${postTranslation.content}
  end`;
  const rows = await observeDbOperation("post.search", "select", () =>
    db
      .select({
        id: post.id,
        title: postTranslation.title,
        content: body,
        type: post.type,
      })
      .from(post)
      .innerJoin(postTranslation, eq(postTranslation.postId, post.id))
      .where(
        and(
          eq(post.status, PostStatus.PUBLISHED),
          sql`${postTranslation.locale} = ${input.locale}`,
          or(
            sql`${postTranslation.title} like ${pattern} escape '\\'`,
            sql`${body} like ${pattern} escape '\\'`,
          ),
        ),
      )
      .orderBy(desc(post.createdAt), asc(post.id))
      .limit(20),
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title ?? "",
    excerpt: plainTextExcerpt(row.content),
    type: parseEnumValue(row.type, Object.values(PostType), "post.type"),
  }));
}
