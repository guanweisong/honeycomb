import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { preProcessFile } from "typescript";
import { sourceFiles } from "@tests/helpers/source-files";

const featuresRoot = join(process.cwd(), "src/features");
const featureNames = readdirSync(featuresRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "contracts")
  .map((entry) => entry.name);

type FeatureSource = { path: string; source: string };

function findCrossFeatureImportViolations(files: readonly FeatureSource[]) {
  return files.flatMap(({ path, source }) => {
    const current = path.match(/src\/features\/([^/]+)\//)?.[1];
    if (!current || current === "contracts") return [];
    return preProcessFile(source, true, true).importedFiles.flatMap(
      ({ fileName }) => {
        const importedPath = fileName.startsWith("@/")
          ? join("src", fileName.slice(2))
          : fileName.startsWith(".")
            ? relative(process.cwd(), resolve(dirname(path), fileName))
            : undefined;
        const match = importedPath
          ?.replaceAll("\\", "/")
          .match(/^src\/features\/([^/]+)(?:\/([^/]+))?/);
        const target = match?.[1];
        const segment = match?.[2];
        return !target ||
          target === current ||
          target === "contracts" ||
          segment === "public"
          ? []
          : [`${path} -> ${target}/${segment ?? "<root>"}`];
      },
    );
  });
}

function isRepositoryForwardingRead(
  name: string,
  body: ts.ConciseBody | undefined,
): boolean {
  if (!/^(get|list|find|query)[A-Z]/.test(name) || !body) return false;

  const statement =
    ts.isBlock(body) && body.statements.length === 1
      ? body.statements[0]
      : undefined;
  const returned = ts.isBlock(body)
    ? statement && ts.isReturnStatement(statement)
      ? statement.expression
      : undefined
    : body;
  const expression =
    returned && ts.isAwaitExpression(returned) ? returned.expression : returned;

  return Boolean(
    expression &&
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    ts.isIdentifier(expression.expression.expression) &&
    expression.expression.expression.text === "repository",
  );
}

function findReadForwardingViolations(files: readonly string[]) {
  return files.flatMap((path) => {
    if (!path.includes("/application/")) return [];

    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const violations: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        if (isRepositoryForwardingRead(node.name.text, node.body)) {
          violations.push(`${relative(process.cwd(), path)}:${node.name.text}`);
        }
      }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer)) &&
        isRepositoryForwardingRead(node.name.text, node.initializer.body)
      ) {
        violations.push(`${relative(process.cwd(), path)}:${node.name.text}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return violations;
  });
}

function findMutationUseCaseViolations(files: readonly FeatureSource[]) {
  return files.flatMap(({ path, source }) => {
    const feature = path.match(/src\/features\/([^/]+)\//)?.[1];
    if (!feature || feature === "contracts" || !path.endsWith(".router.ts")) {
      return [];
    }

    const sourceFile = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const applicationFunctions = new Set<string>();

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause) {
        continue;
      }
      const moduleName = ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : "";
      const isFeatureApplication =
        moduleName.startsWith(`@/features/${feature}/application/`) ||
        moduleName.startsWith(`./application/`);
      if (!isFeatureApplication || statement.importClause.isTypeOnly) continue;

      const bindings = statement.importClause.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      for (const specifier of bindings.elements) {
        if (!specifier.isTypeOnly) {
          applicationFunctions.add(specifier.name.text);
        }
      }
    }

    const violations: string[] = [];
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "mutation"
      ) {
        const handler = node.arguments[0];
        const calledApplicationFunction = new Set<string>();
        if (
          handler &&
          (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler))
        ) {
          const findApplicationCall = (handlerNode: ts.Node) => {
            if (
              ts.isCallExpression(handlerNode) &&
              ts.isIdentifier(handlerNode.expression) &&
              applicationFunctions.has(handlerNode.expression.text)
            ) {
              calledApplicationFunction.add(handlerNode.expression.text);
            }
            ts.forEachChild(handlerNode, findApplicationCall);
          };
          findApplicationCall(handler);
        }

        if (calledApplicationFunction.size === 0) {
          const line =
            sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          violations.push(`${path}:${line}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return violations;
  });
}

describe("业务功能边界", () => {
  it("简单只读查询不保留纯 Repository 转发用例", () => {
    expect(findReadForwardingViolations(sourceFiles(featuresRoot))).toEqual([]);
  });

  it("识别没有调用本 Feature Application 的 mutation", () => {
    const violations = findMutationUseCaseViolations([
      {
        path: "src/features/post/post.router.ts",
        source: [
          'import { createPost } from "@/features/post/application/post-use-cases";',
          "createTRPCRouter({ save: procedure.mutation(({ ctx }) => ctx.db.insert(ctx.input)) });",
        ].join("\n"),
      },
    ]);

    expect(violations).toEqual(["src/features/post/post.router.ts:2"]);
  });

  it("所有 Feature Router 的 mutation 都调用本 Feature Application", () => {
    const routers = sourceFiles(featuresRoot)
      .filter((path) => path.endsWith(".router.ts"))
      .map((path) => ({
        path: relative(process.cwd(), path),
        source: readFileSync(path, "utf8"),
      }));

    expect(findMutationUseCaseViolations(routers)).toEqual([]);
  });

  it("feature 生产代码只从 feature 目录导入业务 schema", () => {
    const violations = sourceFiles(featuresRoot).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return /@\/packages\/trpc\/api\/modules\/.+\/schemas\//.test(source)
        ? [relative(process.cwd(), path)]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it("共享公开契约不依赖普通 CRUD feature 的 service", () => {
    const source = readFileSync(
      join(featuresRoot, "contracts", "content.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /features\/(category|link|tag|page|media|menu|setting)\/service/,
    );
  });

  it("核心 feature 具备 domain、application 和 repository 边界", () => {
    for (const feature of ["post", "comment", "user"]) {
      expect(existsSync(join(featuresRoot, feature, "domain"))).toBe(true);
      expect(existsSync(join(featuresRoot, feature, "application"))).toBe(true);
      expect(
        existsSync(join(featuresRoot, feature, "application", "repository.ts")),
      ).toBe(true);
    }
  });

  it("domain 不依赖 infrastructure 或数据库实现", () => {
    const violations = ["post", "comment", "user"].flatMap((feature) =>
      sourceFiles(join(featuresRoot, feature, "domain")).filter((path) =>
        /infrastructure\/|drizzle-orm|packages\/infrastructure/.test(
          readFileSync(path, "utf8"),
        ),
      ),
    );

    expect(violations).toEqual([]);
  });
  it("为业务提供仓储协议和按需的公开入口", () => {
    for (const feature of featureNames) {
      expect(
        statSync(join(featuresRoot, feature, "application")).isDirectory(),
      ).toBe(true);
      expect(
        statSync(join(featuresRoot, feature, "infrastructure")),
      ).toBeTruthy();
      if (["post", "comment", "user"].includes(feature)) {
        expect(statSync(join(featuresRoot, feature, "domain"))).toBeTruthy();
      }
    }
  });

  it("业务模块不重新引入历史分层目录", () => {
    for (const feature of featureNames) {
      for (const legacyDirectory of ["interfaces", "contracts"]) {
        expect(() =>
          statSync(join(featuresRoot, feature, legacyDirectory)),
        ).toThrow();
      }
    }
  });

  it("禁止 feature 直接导入其他 feature 的内部实现", () => {
    const violations = findCrossFeatureImportViolations(
      sourceFiles(featuresRoot).map((path) => ({
        path: relative(process.cwd(), path),
        source: readFileSync(path, "utf8"),
      })),
    );

    expect(violations).toEqual([]);
  });

  it.each(["domain", "infrastructure", "schemas", "presentation", "admin"])(
    "识别跨 Feature 的 %s 深导入",
    (segment) => {
      expect(
        findCrossFeatureImportViolations([
          {
            path: "src/features/post/application/example.ts",
            source: `import x from \"@/features/comment/${segment}/x\";`,
          },
        ]),
      ).toEqual([
        `src/features/post/application/example.ts -> comment/${segment}`,
      ]);
    },
  );

  it("识别相对路径形式的跨 Feature 深导入", () => {
    expect(
      findCrossFeatureImportViolations([
        {
          path: "src/features/post/application/example.ts",
          source: 'import x from "../../comment/domain/x";',
        },
      ]),
    ).toEqual(["src/features/post/application/example.ts -> comment/domain"]);
  });

  it("允许本 Feature、共享 contracts 与显式 public 出口", () => {
    expect(
      findCrossFeatureImportViolations([
        {
          path: "src/features/post/application/example.ts",
          source: [
            'import a from "@/features/post/domain/x";',
            'import b from "@/features/contracts";',
            'import c from "@/features/comment/public";',
          ].join("\n"),
        },
      ]),
    ).toEqual([]);
  });

  it("禁止用例层直接依赖数据库实现", () => {
    const violations = sourceFiles(featuresRoot)
      .filter((path) => path.includes("/application/"))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        const imports = source.match(
          /from ["'](?:@\/packages\/infrastructure\/db|drizzle-orm)(?:[^"']*)["']/g,
        );
        return (imports ?? []).map(
          (specifier) => `${relative(process.cwd(), path)}: ${specifier}`,
        );
      });

    expect(violations).toEqual([]);
  });
});
