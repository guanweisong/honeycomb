import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as providers from "@/packages/identity/auth/providers";
import * as validation from "@/packages/infrastructure/db/value-validation";

function file(path: string) {
  return ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

describe("配置与契约所有权", () => {
  it("数据库枚举元组完整派生并拒绝空目录", () => {
    expect(validation).toHaveProperty("stringEnumValues");
    if (
      "stringEnumValues" in validation &&
      typeof validation.stringEnumValues === "function"
    ) {
      const values = validation.stringEnumValues;
      expect(values({ first: "A", second: "B" })).toEqual(["A", "B"]);
      expect(() => values({})).toThrow("Empty enum");
    }
  });
  it("内容表枚举默认值引用领域成员，不复制字符串", () => {
    const violations: string[] = [];
    function visit(node: ts.Node) {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "default" &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        violations.push(node.getText());
      ts.forEachChild(node, visit);
    }
    visit(file("src/packages/infrastructure/db/schema/content.ts"));
    expect(violations).toEqual([]);
  });

  it("路由语言集合派生自公共语言目录", () => {
    const violations: string[] = [];
    function visit(node: ts.Node) {
      if (
        ts.isPropertyAssignment(node) &&
        node.name.getText() === "locales" &&
        ts.isArrayLiteralExpression(node.initializer)
      )
        violations.push(node.getText());
      ts.forEachChild(node, visit);
    }
    visit(file("src/packages/ui/navigation/routing.ts"));
    expect(violations).toEqual([]);
  });
  it("提供商目录同时负责筛选已配置的登录方式", () => {
    expect(providers).toHaveProperty("getConfiguredProviderIds");
    if (
      "getConfiguredProviderIds" in providers &&
      typeof providers.getConfiguredProviderIds === "function"
    ) {
      expect(
        providers.getConfiguredProviderIds({
          apple: undefined,
          google: { clientId: "id", clientSecret: "secret" },
          github: undefined,
        }),
      ).toEqual(["google"]);
    }
  });

  it.each([
    "src/features/user/application/login-history-port.ts",
    "src/app/admin/(root)/(dashboard)/account/security/components/LoginHistorySettings/index.tsx",
  ])("%s 引用登录历史事件类型，不重写联合", (path) => {
    const violations: string[] = [];
    function visit(node: ts.Node) {
      if (
        ts.isUnionTypeNode(node) &&
        node.types.some(
          (member) =>
            ts.isLiteralTypeNode(member) &&
            ts.isStringLiteral(member.literal) &&
            member.literal.text === "LOGIN_SUCCESS",
        )
      )
        violations.push(node.getText());
      ts.forEachChild(node, visit);
    }
    visit(file(path));
    expect(violations).toEqual([]);
  });

  it.each(["post", "page", "media", "category", "link", "tag", "comment"])(
    "%s 的分页字段从公共契约派生",
    (feature) => {
      const violations: string[] = [];
      function visit(node: ts.Node) {
        if (ts.isTypeLiteralNode(node) || ts.isInterfaceDeclaration(node)) {
          const names = node.members.map((member) => member.name?.getText());
          if (
            ["page", "limit", "sortField", "sortOrder"].every((name) =>
              names.includes(name),
            )
          )
            violations.push(node.getText());
        }
        ts.forEachChild(node, visit);
      }
      visit(file(`src/features/${feature}/application/repository.ts`));
      expect(violations).toEqual([]);
    },
  );
});
