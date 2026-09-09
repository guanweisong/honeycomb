import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";

import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { PostType } from "@/packages/domain/content/post";
import { PostStatus } from "@/packages/domain/content/post-status";
import { TagType } from "@/packages/domain/content/tag";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { MenuType } from "@/packages/domain/navigation/menu";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
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
} as const;

async function seed(): Promise<void> {
  const url = assertSafeE2ESeedTarget(process.env);
  const username = process.env.E2E_ADMIN_USERNAME ?? "guest";
  const password = process.env.E2E_ADMIN_PASSWORD ?? "123456";
  const client = createClient({ url, authToken: process.env.TURSO_TOKEN });
  const db = drizzle(client, { schema });
  const now = new Date().toISOString();
  const localized = (en: string, zh: string) => ({ en, zh });
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
          siteName: localized("Honeycomb E2E", "蜂巢 E2E"),
          siteSubName: localized("Reliable browser gates", "可靠浏览器门禁"),
          siteSignature: localized("Deterministic test site", "确定性测试站点"),
          siteCopyright: localized("Honeycomb E2E", "蜂巢 E2E"),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.setting.id,
          set: {
            siteName: localized("Honeycomb E2E", "蜂巢 E2E"),
            siteSubName: localized("Reliable browser gates", "可靠浏览器门禁"),
            siteSignature: localized("Deterministic test site", "确定性测试站点"),
            siteCopyright: localized("Honeycomb E2E", "蜂巢 E2E"),
            updatedAt: now,
          },
        });

      await tx
        .insert(schema.category)
        .values({
          id: ids.category,
          description: localized("E2E category", "E2E 分类"),
          title: localized("Engineering", "工程"),
          status: EnableStatus.ENABLE,
          path: "engineering",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.category.id,
          set: {
            description: localized("E2E category", "E2E 分类"),
            title: localized("Engineering", "工程"),
            status: EnableStatus.ENABLE,
            path: "engineering",
            updatedAt: now,
          },
        });

      await tx
        .insert(schema.post)
        .values({
          id: ids.post,
          authorId: ids.user,
          categoryId: ids.category,
          commentStatus: EnableStatus.ENABLE,
          content: localized(
            "<p>Deterministic browser test content.</p>",
            "<p>确定性浏览器测试内容。</p>",
          ),
          excerpt: localized("E2E post excerpt", "E2E 文章摘要"),
          status: PostStatus.PUBLISHED,
          title: localized("Reliable browser gates", "可靠浏览器门禁"),
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
            categoryId: ids.category,
            commentStatus: EnableStatus.ENABLE,
            content: localized(
              "<p>Deterministic browser test content.</p>",
              "<p>确定性浏览器测试内容。</p>",
            ),
            excerpt: localized("E2E post excerpt", "E2E 文章摘要"),
            status: PostStatus.PUBLISHED,
            title: localized("Reliable browser gates", "可靠浏览器门禁"),
            type: PostType.MOVIE,
            movieTime: "2026-09-09",
            updatedAt: now,
          },
        });

      await tx
        .insert(schema.page)
        .values({
          id: ids.page,
          authorId: ids.user,
          content: localized("<p>About the E2E site.</p>", "<p>关于 E2E 站点。</p>"),
          status: PageStatus.PUBLISHED,
          template: PageTemplate.DEFAULT,
          title: localized("About", "关于"),
          views: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.page.id,
          set: {
            authorId: ids.user,
            content: localized("<p>About the E2E site.</p>", "<p>关于 E2E 站点。</p>"),
            status: PageStatus.PUBLISHED,
            template: PageTemplate.DEFAULT,
            title: localized("About", "关于"),
            updatedAt: now,
          },
        });

      await tx
        .insert(schema.tag)
        .values({
          id: ids.tag,
          name: localized("Testing", "测试"),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.tag.id,
          set: { name: localized("Testing", "测试"), updatedAt: now },
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
