// @vitest-environment node

import { createTableRelationsHelpers } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  SQLiteSyncDialect,
  getTableConfig,
  type SQLiteTable,
} from "drizzle-orm/sqlite-core";
import * as schema from "@/lib/db/schema/index";

type ColumnView = {
  config: {
    name: string;
    defaultFn?: () => unknown;
    onUpdateFn?: () => unknown;
  };
};

type RelationHelpers = {
  many: () => {
    withFieldName(fieldName: string): { kind: "many"; fieldName: string };
  };
  one: () => {
    withFieldName(fieldName: string): { kind: "one"; fieldName: string };
  };
};

type RelationView = {
  config: (
    helpers: RelationHelpers,
  ) => Record<string, { kind: string; fieldName: string }>;
};

function requireTable(name: string): SQLiteTable {
  const table: unknown = Reflect.get(schema, name);
  expect(table, `${name} must be exported`).toBeDefined();
  // Drizzle does not expose a runtime predicate for its proxied table type.
  return table as SQLiteTable;
}

describe("db schema helpers", () => {
  it("exposes the expected table column names", () => {
    expect((schema.user.id as unknown as ColumnView).config.name).toBe("id");
    expect(
      (schema.categoryTranslation.title as unknown as ColumnView).config.name,
    ).toBe("title");
    expect(
      (schema.pageTranslation.content as unknown as ColumnView).config.name,
    ).toBe("content");
    expect((schema.menu.pageId as unknown as ColumnView).config.name).toBe(
      "page_id",
    );
    expect((schema.user.username as unknown as ColumnView).config.name).toBe(
      "username",
    );
    expect(
      (schema.account.providerId as unknown as ColumnView).config.name,
    ).toBe("provider_id");
    expect((schema.session.token as unknown as ColumnView).config.name).toBe(
      "token",
    );
    expect(
      (schema.verification.identifier as unknown as ColumnView).config.name,
    ).toBe("identifier");
    expect(
      (schema.passkey.publicKey as unknown as ColumnView).config.name,
    ).toBe("public_key");
    expect(
      (schema.passkey.credentialID as unknown as ColumnView).config.name,
    ).toBe("credential_id");
    expect(
      (schema.loginHistory.userId as unknown as ColumnView).config.name,
    ).toBe("user_id");
    expect(
      (schema.loginHistory.userAgent as unknown as ColumnView).config.name,
    ).toBe("user_agent");
    expect(
      (schema.loginHistory.createdAt as unknown as ColumnView).config.name,
    ).toBe("created_at");
  });

  it.each([
    [
      "categoryTranslation",
      "category_translation",
      "category_id",
      ["title", "description"],
    ],
    [
      "postTranslation",
      "post_translation",
      "post_id",
      [
        "title",
        "content",
        "excerpt",
        "gallery_location",
        "quote_author",
        "quote_content",
      ],
    ],
    ["pageTranslation", "page_translation", "page_id", ["title", "content"]],
    ["tagTranslation", "tag_translation", "tag_id", ["name"]],
    [
      "settingTranslation",
      "setting_translation",
      "setting_id",
      ["site_name", "site_sub_name", "site_signature", "site_copyright"],
    ],
  ])(
    "defines %s with locale integrity and cascade ownership",
    (exportName, tableName, ownerColumn, translatedColumns) => {
      const config = getTableConfig(requireTable(exportName));

      expect(config.name).toBe(tableName);
      expect(config.columns.map(({ name }) => name)).toEqual([
        ownerColumn,
        "locale",
        ...translatedColumns,
      ]);
      expect(config.primaryKeys).toHaveLength(1);
      expect(config.primaryKeys[0]?.columns.map(({ name }) => name)).toEqual([
        ownerColumn,
        "locale",
      ]);
      expect(config.foreignKeys).toHaveLength(1);
      expect(config.foreignKeys[0]?.onDelete).toBe("cascade");
      expect(config.checks).toHaveLength(1);
      const localeCheck = config.checks[0];
      expect(localeCheck?.name).toBe(`${tableName}_locale_check`);
      if (!localeCheck) throw new Error("Missing locale check");
      expect(
        new SQLiteSyncDialect().sqlToQuery(localeCheck.value),
      ).toMatchObject({
        sql: `"${tableName}"."locale" in ('zh', 'en')`,
        params: [],
      });
    },
  );

  it("generates lowercase object ids", () => {
    const sql = (schema.user.id as unknown as ColumnView).config.defaultFn?.();

    expect(
      (sql as unknown as { queryChunks?: Array<{ value?: unknown[] }> })
        ?.queryChunks?.[0]?.value?.[0],
    ).toBe("lower(hex(randomblob(12)))");
  });

  it("creates timestamp defaults and update handlers", () => {
    const createdAt = (
      schema.user.createdAt as unknown as ColumnView
    ).config.defaultFn?.();
    const updatedAt = (
      schema.user.updatedAt as unknown as ColumnView
    ).config.defaultFn?.();
    const updateHandler = (
      schema.user.updatedAt as unknown as ColumnView
    ).config.onUpdateFn?.();

    expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(updateHandler).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("exposes stable persistence invariant checks and the Setting singleton", () => {
    const expectedChecks: Record<string, string[]> = {
      user: ["user_level_check", "user_status_check"],
      category: ["category_status_check"],
      post: [
        "post_comment_status_check",
        "post_status_check",
        "post_type_check",
        "post_views_check",
      ],
      page: ["page_status_check", "page_template_check", "page_views_check"],
      comment: ["comment_status_check", "comment_target_check"],
      media: ["media_size_check", "media_height_check", "media_width_check"],
      menu: ["menu_type_check"],
      postTag: ["post_tag_type_check"],
      link: ["link_status_check"],
      loginHistory: ["login_history_event_check"],
      setting: ["setting_singleton_check"],
    };

    for (const [tableName, checks] of Object.entries(expectedChecks)) {
      const config = getTableConfig(requireTable(tableName));
      expect(config.checks.map(({ name }) => name)).toEqual(
        expect.arrayContaining(checks),
      );
    }

    const settingConfig = getTableConfig(schema.setting);
    expect(settingConfig.columns.map(({ name }) => name)).toContain(
      "singleton_key",
    );
    expect(settingConfig.indexes.map(({ config }) => config.name)).toContain(
      "setting_singleton_idx",
    );
  });

  it("keeps self-relation names and foreign-key wiring intact", () => {
    const category = schema.categoryRelations.config(
      createTableRelationsHelpers(schema.category),
    );
    const comment = schema.commentRelations.config(
      createTableRelationsHelpers(schema.comment),
    );
    const menu = schema.menuRelations.config(
      createTableRelationsHelpers(schema.menu),
    );
    expect(category.parentItem.relationName).toBe("category_parent");
    expect(category.children.relationName).toBe("category_parent");
    expect(category.parentItem.config?.fields).toEqual([
      schema.category.parent,
    ]);
    expect(category.parentItem.config?.references).toEqual([
      schema.category.id,
    ]);
    expect(comment.parent.relationName).toBe("comment_parent");
    expect(comment.children.relationName).toBe("comment_parent");
    expect(comment.parent.config?.fields).toEqual([schema.comment.parentId]);
    expect(comment.parent.config?.references).toEqual([schema.comment.id]);
    expect(menu.parentItem.relationName).toBe("menu_parent");
    expect(menu.children.relationName).toBe("menu_parent");
    expect(menu.parentItem.config?.fields).toEqual([schema.menu.parent]);
    expect(menu.parentItem.config?.references).toEqual([schema.menu.id]);
    const post = schema.postRelations.config(
      createTableRelationsHelpers(schema.post),
    );
    expect(post.cover.referencedTable).toBe(schema.media);
    expect(post.cover.config?.fields).toEqual([schema.post.coverId]);
    expect(post.cover.config?.references).toEqual([schema.media.id]);
  });

  it("exposes the expected relation graph", () => {
    const helpers: RelationHelpers = {
      many: () => ({
        withFieldName(fieldName: string) {
          return { kind: "many", fieldName };
        },
      }),
      one: () => ({
        withFieldName(fieldName: string) {
          return { kind: "one", fieldName };
        },
      }),
    };

    expect(
      (schema.userRelations as unknown as RelationView).config(helpers),
    ).toEqual({
      posts: { kind: "many", fieldName: "posts" },
      pages: { kind: "many", fieldName: "pages" },
      accounts: { kind: "many", fieldName: "accounts" },
      sessions: { kind: "many", fieldName: "sessions" },
      passkeys: { kind: "many", fieldName: "passkeys" },
      loginHistories: { kind: "many", fieldName: "loginHistories" },
    });
    expect(
      (schema.categoryRelations as unknown as RelationView).config(helpers),
    ).toEqual({
      posts: { kind: "many", fieldName: "posts" },
      parentItem: { kind: "one", fieldName: "parentItem" },
      children: { kind: "many", fieldName: "children" },
      translations: { kind: "many", fieldName: "translations" },
    });
    expect(
      (schema.mediaRelations as unknown as RelationView).config(helpers),
    ).toEqual({
      coverPosts: { kind: "many", fieldName: "coverPosts" },
    });
    expect(
      (schema.postRelations as unknown as RelationView).config(helpers),
    ).toEqual({
      author: { kind: "one", fieldName: "author" },
      category: { kind: "one", fieldName: "category" },
      cover: { kind: "one", fieldName: "cover" },
      postTags: { kind: "many", fieldName: "postTags" },
      translations: { kind: "many", fieldName: "translations" },
    });
    expect(
      (schema.tagRelations as unknown as RelationView).config(helpers),
    ).toEqual({
      postTags: { kind: "many", fieldName: "postTags" },
      translations: { kind: "many", fieldName: "translations" },
    });
    expect(
      (schema.postTagRelations as unknown as RelationView).config(helpers),
    ).toEqual({
      post: { kind: "one", fieldName: "post" },
      tag: { kind: "one", fieldName: "tag" },
    });
    expect(
      (schema.pageRelations as unknown as RelationView).config(helpers),
    ).toEqual({
      author: { kind: "one", fieldName: "author" },
      comments: { kind: "many", fieldName: "comments" },
      translations: { kind: "many", fieldName: "translations" },
    });
    expect(
      (schema.commentRelations as unknown as RelationView).config(helpers),
    ).toEqual({
      post: { kind: "one", fieldName: "post" },
      page: { kind: "one", fieldName: "page" },
      parent: { kind: "one", fieldName: "parent" },
      children: { kind: "many", fieldName: "children" },
    });
    expect(
      (schema.menuRelations as unknown as RelationView).config(helpers),
    ).toEqual({
      parentItem: { kind: "one", fieldName: "parentItem" },
      children: { kind: "many", fieldName: "children" },
      category: { kind: "one", fieldName: "category" },
      page: { kind: "one", fieldName: "page" },
    });
    expect(
      (schema.settingRelations as unknown as RelationView).config(helpers),
    ).toEqual({
      translations: { kind: "many", fieldName: "translations" },
    });
    for (const relationName of [
      "categoryTranslationRelations",
      "postTranslationRelations",
      "pageTranslationRelations",
      "tagTranslationRelations",
      "settingTranslationRelations",
    ]) {
      const relation = Reflect.get(schema, relationName) as
        RelationView | undefined;
      expect(relation, `${relationName} must be exported`).toBeDefined();
      expect(relation?.config(helpers)).toEqual({
        owner: { kind: "one", fieldName: "owner" },
      });
    }
  });
});
