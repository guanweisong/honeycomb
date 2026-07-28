import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const actionGuardMatrix = [
  ["(root)/(dashboard)/comment/page.tsx", ["commentModerate"]],
  [
    "(root)/(dashboard)/link/page.tsx",
    ["linkCreate", "linkUpdate", "linkDelete"],
  ],
  ["(root)/(dashboard)/media/page.tsx", ["mediaUpload", "mediaDelete"]],
  ["(root)/(dashboard)/menu/page.tsx", ["menuUpdate"]],
  ["(root)/(dashboard)/page/edit/page.tsx", ["pageCreate", "pageUpdate"]],
  [
    "(root)/(dashboard)/page/list/page.tsx",
    ["pageCreate", "pageUpdate", "pageDelete"],
  ],
  [
    "(root)/(dashboard)/post/category/page.tsx",
    ["categoryCreate", "categoryUpdate", "categoryDelete"],
  ],
  [
    "(root)/(dashboard)/post/edit/components/MultiTag/index.tsx",
    ["postManageTags", "tagCreate"],
  ],
  [
    "(root)/(dashboard)/post/edit/components/PostEditorActions/index.tsx",
    ["postCreate", "postUpdate"],
  ],
  [
    "(root)/(dashboard)/post/edit/components/PostSidebarFields/index.tsx",
    ["categoryCreate"],
  ],
  [
    "(root)/(dashboard)/post/list/page.tsx",
    ["postCreate", "postUpdate", "postDelete"],
  ],
  ["(root)/(dashboard)/setting/page.tsx", ["settingUpdate"]],
  ["(root)/(dashboard)/tag/page.tsx", ["tagCreate", "tagUpdate", "tagDelete"]],
  ["(root)/(dashboard)/user/page.tsx", ["userManage"]],
] as const;

function readUseCanPermissions(
  relativePath: string,
  transformSource: (source: string) => string = (source) => source,
): string[] {
  const fileName = join(process.cwd(), "src/app/admin", relativePath);
  const source = transformSource(readFileSync(fileName, "utf8"));
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const permissionByGuard = new Map<string, string>();
  const collectDeclarations = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "useCan"
    ) {
      const [permission] = node.initializer.arguments;
      if (
        permission &&
        ts.isPropertyAccessExpression(permission) &&
        ts.isIdentifier(permission.expression) &&
        permission.expression.text === "Permission"
      ) {
        permissionByGuard.set(node.name.text, permission.name.text);
      }
    }
    ts.forEachChild(node, collectDeclarations);
  };
  collectDeclarations(sourceFile);

  const ACTION_CONTROL_NAMES = new Set([
    "Button",
    "Checkbox",
    "DataTable",
    "Dialog",
    "DynamicForm",
    "Popover",
    "SortableTree",
  ]);
  const VISIBILITY_ATTRIBUTES = new Set([
    "disabled",
    "renderSubmitButton",
    "rowActions",
    "selectableRows",
  ]);

  const guardNamesIn = (node: ts.Node): string[] => {
    const names = new Set<string>();
    const visit = (child: ts.Node): void => {
      if (ts.isIdentifier(child) && permissionByGuard.has(child.text)) {
        names.add(child.text);
      }
      ts.forEachChild(child, visit);
    };
    visit(node);
    return [...names];
  };

  const containsActionControl = (node: ts.Node): boolean => {
    let found = false;
    const visit = (child: ts.Node): void => {
      if (
        (ts.isJsxElement(child) &&
          ts.isIdentifier(child.openingElement.tagName) &&
          ACTION_CONTROL_NAMES.has(child.openingElement.tagName.text)) ||
        (ts.isJsxSelfClosingElement(child) &&
          ts.isIdentifier(child.tagName) &&
          ACTION_CONTROL_NAMES.has(child.tagName.text))
      ) {
        found = true;
        return;
      }
      ts.forEachChild(child, visit);
    };
    visit(node);
    return found;
  };

  const boundGuards = new Set<string>();
  const markGuardExpression = (expression: ts.Expression): void => {
    if (ts.isParenthesizedExpression(expression)) {
      markGuardExpression(expression.expression);
      return;
    }

    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      containsActionControl(expression.right)
    ) {
      for (const name of guardNamesIn(expression.left)) boundGuards.add(name);
      return;
    }

    if (
      ts.isConditionalExpression(expression) &&
      (containsActionControl(expression.whenTrue) ||
        containsActionControl(expression.whenFalse))
    ) {
      for (const name of guardNamesIn(expression.condition)) {
        boundGuards.add(name);
      }
    }
  };

  const collectBindings = (node: ts.Node): void => {
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      VISIBILITY_ATTRIBUTES.has(node.name.text) &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression
    ) {
      for (const name of guardNamesIn(node.initializer.expression)) {
        boundGuards.add(name);
      }
    }

    if (ts.isJsxExpression(node) && node.expression) {
      markGuardExpression(node.expression);
    }

    ts.forEachChild(node, collectBindings);
  };
  collectBindings(sourceFile);

  return [...boundGuards].map((guard) => permissionByGuard.get(guard)!).sort();
}

describe("admin action capability guards", () => {
  it("rejects an unused permission declaration beside unconditional delete controls", () => {
    const boundPermissions = readUseCanPermissions(
      "(root)/(dashboard)/post/list/page.tsx",
      (source) =>
        source
          .replace("selectableRows={canDeletePost}", "selectableRows={true}")
          .replaceAll("{canDeletePost && (", "{true && ("),
    );

    expect(boundPermissions).not.toContain("postDelete");
  });

  it.each(actionGuardMatrix)(
    "%s binds its controls to the server permissions",
    (relativePath, expectedPermissions) => {
      expect(readUseCanPermissions(relativePath)).toEqual(
        [...expectedPermissions].sort(),
      );
    },
  );
});
