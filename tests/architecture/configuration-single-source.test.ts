import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as providers from "@/lib/auth/providers";
import * as validation from "@/lib/db/value-validation";
import { sourceFile, sourceFiles } from "@tests/helpers/source-files";

function inspectEnumDefaults(source: ts.SourceFile) {
  const enumColumns = new Set<string>();
  const defaults: string[] = [];
  const violations: string[] = [];
  function findColumns(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "enumCheck"
    ) {
      const column = node.arguments[1];
      if (column && ts.isPropertyAccessExpression(column))
        enumColumns.add(column.name.text);
    }
    ts.forEachChild(node, findColumns);
  }
  findColumns(source);
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "default"
    ) {
      let parent: ts.Node | undefined = node.parent;
      while (parent && !ts.isPropertyAssignment(parent)) parent = parent.parent;
      if (
        parent &&
        ts.isPropertyAssignment(parent) &&
        enumColumns.has(parent.name.getText(source))
      ) {
        defaults.push(node.getText(source));
        const value = node.arguments[0];
        if (
          value &&
          (ts.isStringLiteral(value) ||
            ts.isNoSubstitutionTemplateLiteral(value))
        )
          violations.push(node.getText(source));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { defaults, violations };
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
    const definitions = sourceFiles("src/lib/db/schema").filter((path) =>
      /\/content-[^/]+\.ts$/.test(path),
    );
    expect(definitions.length).toBeGreaterThan(0);
    const results = definitions.map((path) =>
      inspectEnumDefaults(sourceFile(path)),
    );
    expect(results.flatMap(({ defaults }) => defaults).length).toBeGreaterThan(
      0,
    );
    expect(results.flatMap(({ violations }) => violations)).toEqual([]);
  });

  it.each([
    ["Status.ENABLED", 0],
    ['"enabled"', 1],
    ["`enabled`", 1],
  ])("enum-default scanner checks actual enum fields: %s", (value, count) => {
    const source = ts.createSourceFile(
      "content-fixture.ts",
      `
      const example = sqliteTable("example", {
        status: text("status").default(${value}).notNull(),
        ordinary: text("ordinary").default("a legitimate string"),
      }, (table) => ({ statusCheck: enumCheck("status", table.status, Object.values(Status)) }));
    `,
      ts.ScriptTarget.Latest,
      true,
    );
    const result = inspectEnumDefaults(source);
    expect(result.defaults).toHaveLength(1);
    expect(result.violations).toHaveLength(count);
    if (count)
      expect(result.violations[0]).toBe(`text("status").default(${value})`);
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
    visit(sourceFile("src/lib/i18n/routing.ts"));
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
    "src/features/user/account-security/login-history.ts",
    "src/features/user/admin/account-security/components/LoginHistorySettings/index.tsx",
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
    visit(sourceFile(path));
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
      visit(sourceFile(`src/features/${feature}/types.ts`));
      expect(violations).toEqual([]);
    },
  );
});

it.each(["category", "post", "page", "tag", "setting"])(
  "%s locale CHECK derives from supportedLanguages",
  (name) => {
    const file = sourceFile(`src/lib/db/schema/content-${name}.ts`);
    const calls: ts.CallExpression[] = [];
    function visit(node: ts.Node) {
      if (
        ts.isCallExpression(node) &&
        node.arguments[0]?.getText() === `"${name}_translation_locale_check"`
      )
        calls.push(node);
      ts.forEachChild(node, visit);
    }
    visit(file);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.expression.getText()).toBe("enumCheck");
    expect(calls[0]?.arguments[2]?.getText()).toBe("supportedLanguages");
  },
);
