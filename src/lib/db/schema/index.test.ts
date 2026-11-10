// @vitest-environment node

import { drizzle } from "drizzle-orm/libsql/web";
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

  it.each([
    [
      schema.category,
      schema.category.parent,
      schema.category,
      schema.category.id,
    ],
    [schema.comment, schema.comment.parentId, schema.comment, schema.comment.id],
    [schema.menu, schema.menu.parent, schema.menu, schema.menu.id],
    [schema.post, schema.post.coverId, schema.media, schema.media.id],
  ])(
    "keeps the physical parent and cover foreign keys",
    (table, from, target, to) => {
      const foreignKey = getTableConfig(table).foreignKeys.find(
        ({ reference }) => reference().columns[0] === from,
      );
      expect(foreignKey?.reference()).toMatchObject({
        columns: [from],
        foreignTable: target,
        foreignColumns: [to],
      });
      expect(foreignKey?.onDelete).toBe("set null");
    },
  );

  it("compiles content and authentication joins through the live relationships", () => {
    const { query } = drizzle.mock({ schema });
    const post = query.post.findMany({
      with: {
        author: true,
        cover: true,
        category: { with: { translations: true } },
        postTags: { with: { tag: { with: { translations: true } } } },
        translations: true,
      },
    }).toSQL();
    for (const table of [
      "user",
      "media",
      "category_translation",
      "post_tag",
      "tag_translation",
      "post_translation",
    ]) {
      expect(post.sql).toContain(`from "${table}"`);
    }

    const menu = query.menu.findMany({
      with: {
        category: { with: { translations: true } },
        page: { with: { translations: true } },
      },
    }).toSQL();
    expect(menu.sql).toContain('from "category_translation"');
    expect(menu.sql).toContain('from "page_translation"');

    const setting = query.setting.findFirst({
      with: { translations: true },
    }).toSQL();
    expect(setting.sql).toContain('from "setting_translation"');

    const session = query.session.findFirst({ with: { user: true } }).toSQL();
    expect(session.sql).toContain('from "user"');
  });

  it("joins a comment's ordinary and custom post references independently", () => {
    const { sql } = drizzle.mock({ schema }).query.comment.findMany({
      with: {
        post: { with: { translations: true } },
        page: { with: { translations: true } },
        customPost: { with: { translations: true } },
      },
    }).toSQL();
    expect(sql).toContain('"comment_post"."id" = "comment"."post_id"');
    expect(sql).toContain('"comment_customPost"."id" = "comment"."custom_id"');
    expect(sql).toContain('"comment_page"."id" = "comment"."page_id"');
  });
});
