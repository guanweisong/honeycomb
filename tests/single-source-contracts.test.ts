import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  CategoryInsertSchema,
  CategoryUpdateSchema,
} from "@/features/category/application/write-schema";
import { CategoryInsertSchema as CategoryTransportInsert } from "@/features/category/schemas/category.insert.schema";
import { CategoryUpdateSchema as CategoryTransportUpdate } from "@/features/category/schemas/category.update.schema";
import {
  TagInsertSchema,
  TagUpdateSchema,
} from "@/features/tag/application/write-schema";
import { TagInsertSchema as TagTransportInsert } from "@/features/tag/schemas/tag.insert.schema";
import { TagUpdateSchema as TagTransportUpdate } from "@/features/tag/schemas/tag.update.schema";
import {
  PublicCommentBaseSchema,
  CommentUpdateSchema,
} from "@/features/comment/application/write-schema";
import { CommentInsertBaseSchema } from "@/features/comment/schemas/comment.insert.schema";
import { CommentUpdateSchema as CommentTransportUpdate } from "@/features/comment/schemas/comment.update.schema";
import { SettingAdminUpdateSchema } from "@/features/setting/application/write-schema";
import { SettingUpdateSchema as SettingTransportUpdate } from "@/features/setting/schemas/setting.update.schema";
import { MenuWriteSchema } from "@/features/menu/application/write-schema";
import { MenuUpdateSchema as MenuTransportUpdate } from "@/features/menu/schemas/menu.update.schema";

function source(path: string) {
  return ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

describe("唯一事实源架构门禁", () => {
  it("transport 消费同一 schema 实例，评论只在共享字段上组合验证码", () => {
    expect(CategoryTransportInsert).toBe(CategoryInsertSchema);
    expect(CategoryTransportUpdate).toBe(CategoryUpdateSchema);
    expect(TagTransportInsert).toBe(TagInsertSchema);
    expect(TagTransportUpdate).toBe(TagUpdateSchema);
    expect(CommentTransportUpdate).toBe(CommentUpdateSchema);
    expect(SettingTransportUpdate).toBe(SettingAdminUpdateSchema);
    expect(MenuTransportUpdate).toBe(MenuWriteSchema);
    for (const key of Object.keys(PublicCommentBaseSchema.shape)) {
      expect(Reflect.get(CommentInsertBaseSchema.shape, key)).toBe(
        Reflect.get(PublicCommentBaseSchema.shape, key),
      );
    }
  });
  it("公开模型出口只能重新导出，不能另建同名模型", () => {
    for (const path of [
      "src/features/contracts/content.ts",
      "src/features/contracts/index.ts",
    ]) {
      const definitions = source(path).statements.filter(
        (node) => !ts.isExportDeclaration(node),
      );
      expect(
        definitions.map((node) => node.getText()),
        path,
      ).toEqual([]);
    }
  });

  it.each([
    ["src/features/post/application/repository.ts", "PostCreateCommand"],
    ["src/features/page/application/repository.ts", "PageCreateCommand"],
    ["src/features/media/application/repository.ts", "MediaInsert"],
    ["src/features/link/application/repository.ts", "LinkInsert"],
    ["src/features/media/application/repository.ts", "MediaRecord"],
    ["src/features/tag/application/repository.ts", "TagRecord"],
    ["src/features/post/application/repository.ts", "PostWithRelations"],
    ["src/packages/trpc/api/context.ts", "User"],
    ["src/features/page/application/repository.ts", "LocalizedText"],
    ["src/features/category/application/repository.ts", "CategoryInsert"],
    ["src/features/category/application/repository.ts", "CategoryUpdate"],
    ["src/features/tag/application/repository.ts", "TagInsert"],
    ["src/features/tag/application/repository.ts", "TagUpdate"],
    ["src/features/comment/application/repository.ts", "PublicCommentInput"],
  ])("%s 的 %s 必须引用或推导，不重写字段", (path, name) => {
    const declaration = source(path).statements.find(
      (node) =>
        (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
        node.name.text === name,
    );
    expect(declaration).toBeDefined();
    expect(declaration && ts.isTypeAliasDeclaration(declaration)).toBe(true);
    if (declaration && ts.isTypeAliasDeclaration(declaration)) {
      expect(ts.isTypeLiteralNode(declaration.type)).toBe(false);
    }
  });

  it.each(["post", "page", "media", "link", "category", "tag"])(
    "%s 写入 schema 出口不维护第二份字段规则",
    (feature) => {
      const file = source(
        `src/features/${feature}/schemas/${feature}.insert.schema.ts`,
      );
      expect(
        file.statements
          .filter((node) => !ts.isExportDeclaration(node))
          .map((node) => node.getText()),
      ).toEqual([]);
    },
  );

  it("Category、Tag、Comment 的更新出口引用 Application 权威 schema", () => {
    const singleSourceFeatures = ["category", "tag", "comment"].filter(
      (feature) => {
        const file = source(
          `src/features/${feature}/schemas/${feature}.update.schema.ts`,
        );
        return (
          file.statements.length > 0 &&
          file.statements.every(
            (node) =>
              ts.isExportDeclaration(node) &&
              node.moduleSpecifier &&
              ts.isStringLiteral(node.moduleSpecifier) &&
              node.moduleSpecifier.text ===
                `@/features/${feature}/application/write-schema`,
          )
        );
      },
    );
    expect(singleSourceFeatures).toEqual(
      expect.arrayContaining(["category", "tag", "comment"]),
    );
  });

  it.each(["setting", "menu"])(
    "%s 的更新出口只重新导出 Application 权威 schema",
    (feature) => {
      const file = source(
        `src/features/${feature}/schemas/${feature}.update.schema.ts`,
      );
      expect(
        file.statements
          .filter((node) => !ts.isExportDeclaration(node))
          .map((node) => node.getText()),
      ).toEqual([]);
      expect(
        file.statements.every(
          (node) =>
            ts.isExportDeclaration(node) &&
            node.moduleSpecifier &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text ===
              `@/features/${feature}/application/write-schema`,
        ),
      ).toBe(true);
    },
  );

  it("Setting 与 Menu Repository 写入类型由 Application schema 推导", () => {
    for (const path of [
      "src/features/setting/application/repository.ts",
      "src/features/menu/application/repository.ts",
    ]) {
      const handwrittenWriteTypes = source(path).statements.filter(
        (node) =>
          ts.isTypeAliasDeclaration(node) &&
          ["SettingUpdate", "MenuInput"].includes(node.name.text) &&
          (ts.isTypeLiteralNode(node.type) ||
            (ts.isArrayTypeNode(node.type) &&
              ts.isTypeLiteralNode(node.type.elementType))),
      );
      expect(
        handwrittenWriteTypes.map((node) => node.getText()),
        path,
      ).toEqual([]);
    }
  });

  it("MenuItem 不允许任意字符串索引扩张读模型", () => {
    const declaration = source(
      "src/features/menu/application/repository.ts",
    ).statements.find(
      (node) => ts.isInterfaceDeclaration(node) && node.name.text === "MenuItem",
    );
    expect(declaration && ts.isInterfaceDeclaration(declaration)).toBe(true);
    if (declaration && ts.isInterfaceDeclaration(declaration)) {
      expect(declaration.members.filter(ts.isIndexSignatureDeclaration)).toEqual(
        [],
      );
    }
  });

  it("评论写用例只依赖统一的 invalidate(plan) 端口", () => {
    const file = readFileSync(
      "src/features/comment/application/comment-commands.ts",
      "utf8",
    );
    expect(file).not.toMatch(/invalidateContent|invalidateAll/);
    expect(file).toMatch(/invalidator\.invalidate\(/);
  });

  it("评论读写适配共享单个记录映射", () => {
    for (const kind of ["query", "command"]) {
      const file = source(
        `src/features/comment/infrastructure/comment-${kind}-repository.ts`,
      );
      expect(
        file.statements
          .filter(
            (node) =>
              ts.isFunctionDeclaration(node) &&
              node.name?.text === "toCommentRecord",
          )
          .map((node) => node.getText()),
      ).toEqual([]);
    }
  });

  it("评论通知适配不重写完整评论字段映射", () => {
    const file = source(
      "src/features/comment/infrastructure/comment-notification-repository.ts",
    );
    const violations: string[] = [];
    function visit(node: ts.Node) {
      if (ts.isObjectLiteralExpression(node)) {
        const names = node.properties
          .filter(ts.isPropertyAssignment)
          .map((property) => property.name.getText());
        if (
          ["id", "author", "email", "status", "userAgent", "ip"].every((name) =>
            names.includes(name),
          )
        )
          violations.push(node.getText());
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
    expect(violations).toEqual([]);
  });

  it("文章列表消费者不再次定义结果字段", () => {
    for (const path of [
      "src/features/post/public/hooks/rq/post/use.infinite.query.post.list.ts",
      "src/features/post/public/components/PostList/index.tsx",
    ]) {
      expect(
        source(path)
          .statements.filter(
            (node) =>
              ts.isTypeAliasDeclaration(node) &&
              ts.isTypeLiteralNode(node.type) &&
              node.name.text === "PostIndexOutput",
          )
          .map((node) => node.getText()),
      ).toEqual([]);
    }
  });

  it("后台与公开评论使用显式不同名称", () => {
    const names = source(
      "src/features/comment/presentation/comment-view-model.ts",
    )
      .statements.filter(ts.isTypeAliasDeclaration)
      .map((node) => node.name.text);
    expect(names).toContain("AdminCommentViewModel");
    expect(names).toContain("PublicCommentViewModel");
    expect(names).not.toContain("CommentViewModel");
  });
});
