import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

describe("唯一事实源架构门禁", () => {
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

  it.each(["post", "page", "media", "link"])(
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
