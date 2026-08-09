import { describe, expect, it } from "vitest";
import * as schema from "./schema";

type ColumnView = {
  config: {
    name: string;
    defaultFn?: () => unknown;
    customTypeParams?: {
      toDriver?: (value: { en: string; zh: string }) => string;
      fromDriver?: (value: string) => { en: string; zh: string } | null;
    };
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
  config: (helpers: RelationHelpers) => Record<string, { kind: string; fieldName: string }>;
};

describe("db schema helpers", () => {
  it("exposes the expected table column names", () => {
    expect((schema.user.id as unknown as ColumnView).config.name).toBe("id");
    expect((schema.category.title as unknown as ColumnView).config.name).toBe("title");
    expect((schema.page.content as unknown as ColumnView).config.name).toBe("content");
    expect((schema.menu.pageId as unknown as ColumnView).config.name).toBe("page_id");
    expect((schema.user.username as unknown as ColumnView).config.name).toBe("username");
    expect((schema.account.providerId as unknown as ColumnView).config.name).toBe("provider_id");
    expect((schema.session.token as unknown as ColumnView).config.name).toBe("token");
    expect((schema.verification.identifier as unknown as ColumnView).config.name).toBe("identifier");
    expect((schema.passkey.publicKey as unknown as ColumnView).config.name).toBe("public_key");
    expect((schema.passkey.credentialID as unknown as ColumnView).config.name).toBe("credential_id");
  });

  it("generates lowercase object ids", () => {
    const sql = (schema.user.id as unknown as ColumnView).config.defaultFn?.();

    expect((sql as unknown as { queryChunks?: Array<{ value?: unknown[] }> })?.queryChunks?.[0]?.value?.[0]).toBe(
      "lower(hex(randomblob(12)))",
    );
  });

  it("serializes and parses i18n fields", () => {
    const toDriver = (schema.category.title as unknown as ColumnView).config.customTypeParams?.toDriver;
    const fromDriver = (schema.category.title as unknown as ColumnView).config.customTypeParams?.fromDriver;

    expect(toDriver?.({ en: "hello", zh: "你好" })).toBe(
      JSON.stringify({ en: "hello", zh: "你好" }),
    );
    expect(fromDriver?.("{\"en\":\"hello\",\"zh\":\"你好\"}")).toEqual({
      en: "hello",
      zh: "你好",
    });
    expect(fromDriver?.("{invalid json}")).toBeNull();
  });

  it("creates timestamp defaults and update handlers", () => {
    const createdAt = (schema.user.createdAt as unknown as ColumnView).config.defaultFn?.();
    const updatedAt = (schema.user.updatedAt as unknown as ColumnView).config.defaultFn?.();
    const updateHandler = (schema.user.updatedAt as unknown as ColumnView).config.onUpdateFn?.();

    expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(updateHandler).toMatch(/^\d{4}-\d{2}-\d{2}T/);
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

    expect((schema.userRelations as unknown as RelationView).config(helpers)).toEqual({
      posts: { kind: "many", fieldName: "posts" },
      pages: { kind: "many", fieldName: "pages" },
      accounts: { kind: "many", fieldName: "accounts" },
      sessions: { kind: "many", fieldName: "sessions" },
      passkeys: { kind: "many", fieldName: "passkeys" },
    });
    expect((schema.categoryRelations as unknown as RelationView).config(helpers)).toEqual({
      posts: { kind: "many", fieldName: "posts" },
      parentItem: { kind: "one", fieldName: "parentItem" },
      children: { kind: "many", fieldName: "children" },
    });
    expect((schema.mediaRelations as unknown as RelationView).config(helpers)).toEqual({
      coverPosts: { kind: "many", fieldName: "coverPosts" },
    });
    expect((schema.postRelations as unknown as RelationView).config(helpers)).toEqual({
      author: { kind: "one", fieldName: "author" },
      category: { kind: "one", fieldName: "category" },
      cover: { kind: "one", fieldName: "cover" },
      postTags: { kind: "many", fieldName: "postTags" },
    });
    expect((schema.tagRelations as unknown as RelationView).config(helpers)).toEqual({
      postTags: { kind: "many", fieldName: "postTags" },
    });
    expect((schema.postTagRelations as unknown as RelationView).config(helpers)).toEqual({
      post: { kind: "one", fieldName: "post" },
      tag: { kind: "one", fieldName: "tag" },
    });
    expect((schema.pageRelations as unknown as RelationView).config(helpers)).toEqual({
      author: { kind: "one", fieldName: "author" },
      comments: { kind: "many", fieldName: "comments" },
    });
    expect((schema.commentRelations as unknown as RelationView).config(helpers)).toEqual({
      post: { kind: "one", fieldName: "post" },
      page: { kind: "one", fieldName: "page" },
      parent: { kind: "one", fieldName: "parent" },
      children: { kind: "many", fieldName: "children" },
    });
    expect((schema.menuRelations as unknown as RelationView).config(helpers)).toEqual({
      parentItem: { kind: "one", fieldName: "parentItem" },
      children: { kind: "many", fieldName: "children" },
      category: { kind: "one", fieldName: "category" },
      page: { kind: "one", fieldName: "page" },
    });
  });
});
