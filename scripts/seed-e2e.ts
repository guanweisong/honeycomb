import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";

import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { PostType } from "@/packages/domain/content/post";
import { PostStatus } from "@/packages/domain/content/post-status";
import { TagType } from "@/packages/domain/content/tag";
import { CommentStatus } from "@/packages/domain/content/comment";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { MenuType } from "@/packages/domain/navigation/menu";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { MultiLangEnum } from "@/packages/domain/localization/i18n";
import * as schema from "@/packages/infrastructure/db/schema";
import { hashCredentialPassword } from "@/packages/identity/auth/credentials";
import { assertSafeE2ESeedTarget } from "./e2e-seed-policy";

const ids = {
  user: "000000000000000000000001",
  account: "000000000000000000000002",
  setting: "000000000000000000000003",
  category: "000000000000000000000004",
  post: "000000000000000000000005",
  page: "000000000000000000000006",
  categoryMenu: "000000000000000000000007",
  pageMenu: "000000000000000000000008",
  tag: "000000000000000000000009",
  childCategory: "000000000000000000000010",
  grandchildCategory: "000000000000000000000011",
  bannedComment: "000000000000000000000012",
  replyComment: "000000000000000000000013",
} as const;

async function seed(): Promise<void> {
  const url = assertSafeE2ESeedTarget(process.env);
  const username = process.env.E2E_ADMIN_USERNAME ?? "guest";
  const password = process.env.E2E_ADMIN_PASSWORD ?? "123456";
  const client = createClient({ url, authToken: process.env.TURSO_TOKEN });
  const db = drizzle(client, { schema });
  const now = new Date().toISOString();
  const passwordHash = await hashCredentialPassword(password);

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(schema.user)
        .values({
          id: ids.user,
          email: "guest@honeycomb.test",
          emailVerified: true,
          level: UserLevel.GUEST,
          name: username,
          username,
          displayUsername: username,
          status: UserStatus.ENABLE,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.user.id,
          set: {
            email: "guest@honeycomb.test",
            emailVerified: true,
            level: UserLevel.GUEST,
            name: username,
            username,
            displayUsername: username,
            status: UserStatus.ENABLE,
            updatedAt: now,
          },
        });

      await tx
        .insert(schema.account)
        .values({
          id: ids.account,
          accountId: ids.user,
          providerId: "credential",
          userId: ids.user,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.account.id,
          set: { password: passwordHash, updatedAt: now },
        });

      await tx
        .insert(schema.setting)
        .values({
          id: ids.setting,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.setting.id,
          set: { updatedAt: now },
        });
      await tx.insert(schema.settingTranslation).values([
        { settingId: ids.setting, locale: MultiLangEnum.En, siteName: "Honeycomb E2E", siteSubName: "Reliable browser gates", siteSignature: "Deterministic test site", siteCopyright: "Honeycomb E2E" },
        { settingId: ids.setting, locale: MultiLangEnum.Zh, siteName: "蜂巢 E2E", siteSubName: "可靠浏览器门禁", siteSignature: "确定性测试站点", siteCopyright: "蜂巢 E2E" },
      ]).onConflictDoUpdate({
        target: [schema.settingTranslation.settingId, schema.settingTranslation.locale],
        set: { siteName: schema.settingTranslation.siteName, siteSubName: schema.settingTranslation.siteSubName, siteSignature: schema.settingTranslation.siteSignature, siteCopyright: schema.settingTranslation.siteCopyright },
      });

      await tx
        .insert(schema.category)
        .values({
          id: ids.category,
          status: EnableStatus.ENABLE,
          path: "engineering",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.category.id,
          set: {
            status: EnableStatus.ENABLE,
            path: "engineering",
            updatedAt: now,
          },
        });
      await tx.insert(schema.categoryTranslation).values([
        { categoryId: ids.category, locale: MultiLangEnum.En, title: "Engineering", description: "E2E category" },
        { categoryId: ids.category, locale: MultiLangEnum.Zh, title: "工程", description: "E2E 分类" },
      ]).onConflictDoUpdate({
        target: [schema.categoryTranslation.categoryId, schema.categoryTranslation.locale],
        set: { title: schema.categoryTranslation.title, description: schema.categoryTranslation.description },
      });

      for (const category of [
        {
          id: ids.childCategory,
          parent: ids.category,
          path: "testing",
          title: { en: "Testing", zh: "测试" },
        },
        {
          id: ids.grandchildCategory,
          parent: ids.childCategory,
          path: "browser-tests",
          title: { en: "Browser tests", zh: "浏览器测试" },
        },
      ]) {
        await tx
          .insert(schema.category)
          .values({
            id: category.id,
            parent: category.parent,
            path: category.path,
            status: EnableStatus.ENABLE,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.category.id,
            set: { parent: category.parent, path: category.path, status: EnableStatus.ENABLE, updatedAt: now },
          });
        await tx.insert(schema.categoryTranslation).values([
          { categoryId: category.id, locale: MultiLangEnum.En, title: category.title.en, description: "Nested E2E category" },
          { categoryId: category.id, locale: MultiLangEnum.Zh, title: category.title.zh, description: "嵌套 E2E 分类" },
        ]).onConflictDoUpdate({
          target: [schema.categoryTranslation.categoryId, schema.categoryTranslation.locale],
          set: { title: schema.categoryTranslation.title, description: schema.categoryTranslation.description },
        });
      }

      await tx
        .insert(schema.post)
        .values({
          id: ids.post,
          authorId: ids.user,
          categoryId: ids.grandchildCategory,
          commentStatus: EnableStatus.ENABLE,
          status: PostStatus.PUBLISHED,
          type: PostType.MOVIE,
          movieTime: "2026-09-09",
          views: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.post.id,
          set: {
            authorId: ids.user,
            categoryId: ids.grandchildCategory,
            commentStatus: EnableStatus.ENABLE,
            status: PostStatus.PUBLISHED,
            type: PostType.MOVIE,
            movieTime: "2026-09-09",
            updatedAt: now,
          },
        });
      await tx.insert(schema.postTranslation).values([
        { postId: ids.post, locale: MultiLangEnum.En, title: "Reliable browser gates", content: "<p>Deterministic browser test content.</p>", excerpt: "E2E post excerpt" },
        { postId: ids.post, locale: MultiLangEnum.Zh, title: "可靠浏览器门禁", content: "<p>确定性浏览器测试内容。</p>", excerpt: "E2E 文章摘要" },
      ]).onConflictDoUpdate({
        target: [schema.postTranslation.postId, schema.postTranslation.locale],
        set: { title: schema.postTranslation.title, content: schema.postTranslation.content, excerpt: schema.postTranslation.excerpt },
      });

      for (const comment of [
        {
          id: ids.bannedComment,
          parentId: null,
          author: "Moderated author",
          content: "PRIVATE_BANNED_COMMENT_SENTINEL",
          status: CommentStatus.BAN,
        },
        {
          id: ids.replyComment,
          parentId: ids.bannedComment,
          author: "Public reply author",
          content: "Visible reply beneath moderated parent",
          status: CommentStatus.PUBLISH,
        },
      ]) {
        await tx
          .insert(schema.comment)
          .values({
            ...comment,
            postId: ids.post,
            email: "private-comment@honeycomb.test",
            ip: "192.0.2.10",
            userAgent: "PRIVATE_AGENT_SENTINEL",
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.comment.id,
            set: { ...comment, updatedAt: now },
          });
      }

      await tx
        .insert(schema.page)
        .values({
          id: ids.page,
          authorId: ids.user,
          status: PageStatus.PUBLISHED,
          template: PageTemplate.DEFAULT,
          views: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.page.id,
          set: {
            authorId: ids.user,
            status: PageStatus.PUBLISHED,
            template: PageTemplate.DEFAULT,
            updatedAt: now,
          },
        });
      await tx.insert(schema.pageTranslation).values([
        { pageId: ids.page, locale: MultiLangEnum.En, title: "About", content: "<p>About the E2E site.</p>" },
        { pageId: ids.page, locale: MultiLangEnum.Zh, title: "关于", content: "<p>关于 E2E 站点。</p>" },
      ]).onConflictDoUpdate({
        target: [schema.pageTranslation.pageId, schema.pageTranslation.locale],
        set: { title: schema.pageTranslation.title, content: schema.pageTranslation.content },
      });

      await tx
        .insert(schema.tag)
        .values({
          id: ids.tag,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.tag.id,
          set: { updatedAt: now },
        });
      await tx.insert(schema.tagTranslation).values([
        { tagId: ids.tag, locale: MultiLangEnum.En, name: "Testing" },
        { tagId: ids.tag, locale: MultiLangEnum.Zh, name: "测试" },
      ]).onConflictDoUpdate({
        target: [schema.tagTranslation.tagId, schema.tagTranslation.locale],
        set: { name: schema.tagTranslation.name },
      });

      await tx
        .insert(schema.menu)
        .values([
          {
            id: ids.categoryMenu,
            categoryId: ids.category,
            power: 1,
            type: MenuType.CATEGORY,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: ids.pageMenu,
            pageId: ids.page,
            power: 2,
            type: MenuType.PAGE,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .onConflictDoNothing();

      await tx
        .delete(schema.postTag)
        .where(eq(schema.postTag.postId, ids.post));
      await tx.insert(schema.postTag).values({
        postId: ids.post,
        tagId: ids.tag,
        type: TagType.MOVIE_STYLE,
      });
    });
  } finally {
    client.close();
  }

  process.stdout.write(`Seeded deterministic E2E data in ${url}\n`);
}

if (import.meta.main) await seed();
