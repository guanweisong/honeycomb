import { describe, expect, it } from "vitest";
import * as schema from "./schema";

describe("db schema helpers", () => {
  it("exposes the expected table column names", () => {
    expect(schema.user.id.config.name).toBe("id");
    expect(schema.category.title.config.name).toBe("title");
    expect(schema.page.content.config.name).toBe("content");
    expect(schema.menu.pageId.config.name).toBe("page_id");
  });

  it("generates lowercase object ids", () => {
    const sql = schema.user.id.config.defaultFn?.();

    expect(sql?.queryChunks[0]?.value?.[0]).toBe("lower(hex(randomblob(12)))");
  });

  it("serializes and parses i18n fields", () => {
    const toDriver = schema.category.title.config.customTypeParams?.toDriver;
    const fromDriver = schema.category.title.config.customTypeParams?.fromDriver;

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
    const createdAt = schema.user.createdAt.config.defaultFn?.();
    const updatedAt = schema.user.updatedAt.config.defaultFn?.();
    const updateHandler = schema.user.updatedAt.config.onUpdateFn?.();

    expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(updateHandler).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("exposes the expected relation graph", () => {
    const helpers = {
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

    expect(schema.userRelations.config(helpers)).toEqual({
      posts: { kind: "many", fieldName: "posts" },
      pages: { kind: "many", fieldName: "pages" },
    });
    expect(schema.categoryRelations.config(helpers)).toEqual({
      posts: { kind: "many", fieldName: "posts" },
      parentItem: { kind: "one", fieldName: "parentItem" },
      children: { kind: "many", fieldName: "children" },
    });
    expect(schema.mediaRelations.config(helpers)).toEqual({
      coverPosts: { kind: "many", fieldName: "coverPosts" },
    });
    expect(schema.postRelations.config(helpers)).toEqual({
      author: { kind: "one", fieldName: "author" },
      category: { kind: "one", fieldName: "category" },
      cover: { kind: "one", fieldName: "cover" },
      postTags: { kind: "many", fieldName: "postTags" },
    });
    expect(schema.tagRelations.config(helpers)).toEqual({
      postTags: { kind: "many", fieldName: "postTags" },
    });
    expect(schema.postTagRelations.config(helpers)).toEqual({
      post: { kind: "one", fieldName: "post" },
      tag: { kind: "one", fieldName: "tag" },
    });
    expect(schema.pageRelations.config(helpers)).toEqual({
      author: { kind: "one", fieldName: "author" },
      comments: { kind: "many", fieldName: "comments" },
    });
    expect(schema.commentRelations.config(helpers)).toEqual({
      post: { kind: "one", fieldName: "post" },
      page: { kind: "one", fieldName: "page" },
      parent: { kind: "one", fieldName: "parent" },
      children: { kind: "many", fieldName: "children" },
    });
    expect(schema.menuRelations.config(helpers)).toEqual({
      parentItem: { kind: "one", fieldName: "parentItem" },
      children: { kind: "many", fieldName: "children" },
      category: { kind: "one", fieldName: "category" },
      page: { kind: "one", fieldName: "page" },
    });
  });
});
