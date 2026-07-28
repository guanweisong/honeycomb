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

function readUseCanPermissions(relativePath: string): string[] {
  const fileName = join(process.cwd(), "src/app/admin", relativePath);
  const sourceFile = ts.createSourceFile(
    fileName,
    readFileSync(fileName, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const permissions = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "useCan"
    ) {
      const [permission] = node.arguments;
      if (
        permission &&
        ts.isPropertyAccessExpression(permission) &&
        ts.isIdentifier(permission.expression) &&
        permission.expression.text === "Permission"
      ) {
        permissions.add(permission.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...permissions].sort();
}

describe("admin action capability guards", () => {
  it.each(actionGuardMatrix)(
    "%s binds its controls to the server permissions",
    (relativePath, expectedPermissions) => {
      expect(readUseCanPermissions(relativePath)).toEqual(
        [...expectedPermissions].sort(),
      );
    },
  );
});
