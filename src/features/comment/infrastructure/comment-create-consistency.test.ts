// @vitest-environment node
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/packages/infrastructure/db/schema";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PageStatus } from "@/packages/domain/content/page";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { MultiLangEnum } from "@/packages/domain/localization/i18n";
import { createComment } from "../application/comment-commands";
import type { PublicCommentInput } from "../application/repository";
import { createCommentCommandRepository } from "./comment-command-repository";
import { createCommentTargetRepository } from "./comment-target-repository";

describe("public comment insertion consistency with real libSQL", () => {
  let directory: string;
  let client: ReturnType<typeof createClient>;
  let competingClient: ReturnType<typeof createClient>;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let competingDb: typeof db;
  let notifications: number;
  let invalidations: number;
  const metadata = { ip: "203.0.113.10", userAgent: "Browser" };
  const comment = {
    author: "Visitor",
    email: "visitor@example.test",
    content: "new public comment",
  };

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-comment-consistency-"));
    const url = `file:${join(directory, "test.db")}`;
    client = createClient({ url });
    competingClient = createClient({ url });
    db = drizzle(client, { schema });
    competingDb = drizzle(competingClient, { schema });
    for (const file of readdirSync("drizzle")
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      await client.executeMultiple(readFileSync(`drizzle/${file}`, "utf8"));
    }
    await db.insert(schema.user).values({
      id: "author",
      name: "Author",
      email: "author@example.test",
    });
    await db.insert(schema.category).values({
      id: "category",
      path: "category",
    });
    await db.insert(schema.categoryTranslation).values([
      { categoryId: "category", locale: MultiLangEnum.En, title: "Category", description: "Category" },
      { categoryId: "category", locale: MultiLangEnum.Zh, title: "分类", description: "分类" },
    ]);
    await db.insert(schema.post).values(
      ["post", "other-post", "custom-post"].map((id) => ({
        id,
        authorId: "author",
        categoryId: "category",
        status: PostStatus.PUBLISHED,
        commentStatus: EnableStatus.ENABLE,
      })),
    );
    await db.insert(schema.page).values({
      id: "page",
      authorId: "author",
      status: PageStatus.PUBLISHED,
    });
    await db.insert(schema.pageTranslation).values([
      { pageId: "page", locale: MultiLangEnum.En, title: "Page", content: "Page" },
      { pageId: "page", locale: MultiLangEnum.Zh, title: "页面", content: "页面" },
    ]);
    await db.insert(schema.comment).values({
      ...comment,
      id: "parent",
      content: "parent comment",
      postId: "post",
    });
    notifications = 0;
    invalidations = 0;
  });

  afterEach(() => {
    client.close();
    competingClient.close();
    rmSync(directory, { recursive: true, force: true });
  });

  function dependencies(afterRead?: {
    kind: "target" | "parent";
    change: () => Promise<unknown>;
  }) {
    const targetRepository = createCommentTargetRepository(db);
    let interleaved = false;
    async function interleave(kind: "target" | "parent") {
      if (!interleaved && afterRead?.kind === kind) {
        interleaved = true;
        await afterRead.change();
      }
    }
    return {
      repository: createCommentCommandRepository(db),
      targetRepository: {
        findTarget: async (
          target: Parameters<typeof targetRepository.findTarget>[0],
        ) => {
          const snapshot = await targetRepository.findTarget(target);
          await interleave("target");
          return snapshot;
        },
        findParentTarget: async (parentId: string) => {
          const snapshot = await targetRepository.findParentTarget(parentId);
          await interleave("parent");
          return snapshot;
        },
      },
      validateCaptcha: async () => {},
      notify: async () => {
        notifications += 1;
      },
      logNotificationFailure: () => {},
      invalidator: {
        invalidate: async () => {
          invalidations += 1;
        },
      },
    };
  }

  const races = [
    {
      name: "post becomes unpublished",
      mutation: "post-status",
      code: "NOT_FOUND",
    },
    {
      name: "post disables comments",
      mutation: "post-comments",
      code: "FORBIDDEN",
    },
    {
      name: "page becomes unpublished",
      mutation: "page-status",
      code: "NOT_FOUND",
    },
    {
      name: "parent changes target",
      mutation: "parent-target",
      code: "BAD_REQUEST",
    },
    {
      name: "parent gains another target",
      mutation: "parent-ambiguous",
      code: "BAD_REQUEST",
    },
    {
      name: "parent is deleted",
      mutation: "parent-delete",
      code: "BAD_REQUEST",
    },
  ] as const;

  it.each(races)(
    "rejects when $name after validation",
    async ({ mutation, code }) => {
      const input: PublicCommentInput = {
        ...comment,
        ...(mutation === "page-status"
          ? { pageId: "page" }
          : { postId: "post" }),
        ...(mutation.startsWith("parent-") ? { parentId: "parent" } : {}),
      };
      const afterRead = {
        kind: mutation.startsWith("parent-")
          ? ("parent" as const)
          : ("target" as const),
        change: async () => {
          switch (mutation) {
            case "post-status":
              return competingDb
                .update(schema.post)
                .set({ status: PostStatus.TO_AUDIT })
                .where(eq(schema.post.id, "post"));
            case "post-comments":
              return competingDb
                .update(schema.post)
                .set({ commentStatus: EnableStatus.DISABLE })
                .where(eq(schema.post.id, "post"));
            case "page-status":
              return competingDb
                .update(schema.page)
                .set({ status: PageStatus.DRAFT })
                .where(eq(schema.page.id, "page"));
            case "parent-target":
              return competingDb
                .update(schema.comment)
                .set({ postId: "other-post" })
                .where(eq(schema.comment.id, "parent"));
            case "parent-ambiguous":
              return competingDb
                .update(schema.comment)
                .set({ pageId: "page" })
                .where(eq(schema.comment.id, "parent"));
            case "parent-delete":
              return competingDb
                .delete(schema.comment)
                .where(eq(schema.comment.id, "parent"));
          }
        },
      };
      await expect(
        createComment(dependencies(afterRead), metadata, input),
      ).rejects.toMatchObject({ code });
      expect(
        await db
          .select()
          .from(schema.comment)
          .where(eq(schema.comment.content, comment.content)),
      ).toEqual([]);
      expect(notifications).toBe(0);
      expect(invalidations).toBe(0);
    },
  );

  it.each([
    { target: { postId: "post", parentId: "parent" }, invalidations: 1 },
    { target: { pageId: "page" }, invalidations: 1 },
    { target: { customId: "custom-post" }, invalidations: 1 },
  ])(
    "preserves valid target semantics for $target",
    async ({ target, invalidations: expectedInvalidations }) => {
      const result = await createComment(dependencies(), metadata, {
        ...comment,
        ...target,
      });
      expect(result.content).toBe("new public comment");
      expect(result).not.toHaveProperty("email");
      const [stored] = await db
        .select()
        .from(schema.comment)
        .where(eq(schema.comment.id, result.id));
      expect(stored).toMatchObject({
        ...metadata,
        ...target,
        status: "PUBLISH",
      });
      expect(notifications).toBe(1);
      expect(invalidations).toBe(expectedInvalidations);
    },
  );
});
