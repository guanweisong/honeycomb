import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  actionGuardMatrix,
  type ActionControlIdentity,
  type ActionGuardContract,
  type GuardPolarity,
} from "./admin-action-guard-matrix";

function getAttribute(
  element: ts.JsxOpeningLikeElement,
  name: string,
): ts.JsxAttribute | undefined {
  return element.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === name,
  );
}

function getAttributeExpression(
  element: ts.JsxOpeningLikeElement,
  name: string,
): ts.Expression | undefined {
  const initializer = getAttribute(element, name)?.initializer;
  return initializer &&
    ts.isJsxExpression(initializer) &&
    initializer.expression
    ? initializer.expression
    : undefined;
}

function collectGuardPolarities(
  node: ts.Node,
  guardName: string,
  negated = false,
  result = new Set<GuardPolarity>(),
): Set<GuardPolarity> {
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.ExclamationToken
  ) {
    return collectGuardPolarities(node.operand, guardName, !negated, result);
  }

  if (ts.isIdentifier(node) && node.text === guardName) {
    result.add(negated ? "negative" : "positive");
    return result;
  }

  ts.forEachChild(node, (child) => {
    collectGuardPolarities(child, guardName, negated, result);
  });
  return result;
}

function hasGuardPolarity(
  node: ts.Node,
  guardName: string,
  polarity: GuardPolarity,
): boolean {
  const polarities = collectGuardPolarities(node, guardName);
  return polarities.size === 1 && polarities.has(polarity);
}

function containsNode(container: ts.Node, target: ts.Node): boolean {
  return container.pos <= target.pos && container.end >= target.end;
}

function isGuardedByAncestor(
  target: ts.Node,
  guardName: string,
  polarity: GuardPolarity,
): boolean {
  for (let ancestor = target.parent; ancestor; ancestor = ancestor.parent) {
    if (
      ts.isBinaryExpression(ancestor) &&
      ancestor.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      containsNode(ancestor.right, target) &&
      hasGuardPolarity(ancestor.left, guardName, polarity)
    ) {
      return true;
    }

    if (ts.isConditionalExpression(ancestor)) {
      const inTrueBranch = containsNode(ancestor.whenTrue, target);
      const inFalseBranch = containsNode(ancestor.whenFalse, target);
      const branchPolarity = inFalseBranch
        ? polarity === "positive"
          ? "negative"
          : "positive"
        : polarity;
      if (
        (inTrueBranch || inFalseBranch) &&
        hasGuardPolarity(ancestor.condition, guardName, branchPolarity)
      ) {
        return true;
      }
    }
  }
  return false;
}

function matchesActionExpression(
  expression: ts.Expression,
  identity: ActionControlIdentity,
  sourceFile: ts.SourceFile,
): boolean {
  if (identity.reference) {
    return (
      ts.isIdentifier(expression) && expression.text === identity.reference
    );
  }

  if (!identity.call) return true;

  let matched = false;
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === identity.call!.callee &&
      (!identity.call!.argument ||
        node.arguments.some((argument) => {
          let foundArgument = false;
          const findArgument = (child: ts.Node): void => {
            if (child.getText(sourceFile) === identity.call!.argument) {
              foundArgument = true;
              return;
            }
            ts.forEachChild(child, findArgument);
          };
          findArgument(argument);
          return foundArgument;
        }))
    ) {
      matched = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return matched;
}

function getControlLabel(node: ts.Node): string {
  const text: string[] = [];
  const visit = (child: ts.Node): void => {
    if (ts.isJsxText(child)) text.push(child.text);
    ts.forEachChild(child, visit);
  };
  visit(node);
  return text.join(" ").replace(/\s+/g, " ").trim();
}

function findMatchingControls(
  sourceFile: ts.SourceFile,
  identity: ActionControlIdentity,
): (ts.JsxElement | ts.JsxSelfClosingElement)[] {
  const controls: (ts.JsxElement | ts.JsxSelfClosingElement)[] = [];
  const visit = (node: ts.Node): void => {
    const element = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : undefined;
    if (
      element &&
      ts.isIdentifier(element.tagName) &&
      element.tagName.text === identity.tag
    ) {
      const actionExpression = getAttributeExpression(
        element,
        identity.attribute,
      );
      if (
        actionExpression &&
        matchesActionExpression(actionExpression, identity, sourceFile) &&
        (!identity.label || getControlLabel(node) === identity.label)
      ) {
        controls.push(node as ts.JsxElement | ts.JsxSelfClosingElement);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return controls;
}

function collectPermissionGuards(
  sourceFile: ts.SourceFile,
): Map<string, string> {
  const guardByPermission = new Map<string, string>();
  const visit = (node: ts.Node): void => {
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
        guardByPermission.set(permission.name.text, node.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return guardByPermission;
}

function findUnboundActionIds(
  relativePath: string,
  actions: readonly ActionGuardContract[],
  transformSource: (source: string) => string = (source) => source,
): string[] {
  const fileName = join(process.cwd(), "src/app/admin", relativePath);
  const sourceFile = ts.createSourceFile(
    fileName,
    transformSource(readFileSync(fileName, "utf8")),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const guardByPermission = collectPermissionGuards(sourceFile);

  return actions
    .filter((action) => {
      const guardName = guardByPermission.get(action.permission);
      if (!guardName) return true;

      const controls = findMatchingControls(sourceFile, action.control);
      return (
        controls.length !== (action.expectedCount ?? 1) ||
        !controls.every((control) => {
          if (action.guard.kind === "ancestor") {
            return isGuardedByAncestor(
              control,
              guardName,
              action.guard.polarity,
            );
          }

          const element = ts.isJsxElement(control)
            ? control.openingElement
            : control;
          const guardExpression = getAttributeExpression(
            element,
            action.guard.attribute,
          );
          return (
            !!guardExpression &&
            hasGuardPolarity(guardExpression, guardName, action.guard.polarity)
          );
        })
      );
    })
    .map((action) => action.id);
}

function getActions(relativePath: string): readonly ActionGuardContract[] {
  return actionGuardMatrix.find((entry) => entry.relativePath === relativePath)!
    .actions;
}

describe("admin action capability guards", () => {
  const postListPath = "(root)/(dashboard)/post/list/page.tsx";

  it("rejects an unused permission declaration beside unconditional delete controls", () => {
    expect(
      findUnboundActionIds(postListPath, getActions(postListPath), (source) =>
        source
          .replace("selectableRows={canDeletePost}", "selectableRows={true}")
          .replaceAll("{canDeletePost && (", "{true && ("),
      ),
    ).toContain("post-list.delete");
  });

  it("rejects create and delete guards swapped between their actions", () => {
    const unboundActions = findUnboundActionIds(
      postListPath,
      getActions(postListPath),
      (source) =>
        source
          .replaceAll("canCreatePost &&", "swappedGuard &&")
          .replaceAll("canDeletePost &&", "canCreatePost &&")
          .replaceAll("swappedGuard &&", "canDeletePost &&"),
    );

    expect(unboundActions).toContain("post-list.create");
    expect(unboundActions).toContain("post-list.delete");
  });

  it("rejects a guarded dummy button beside an unconditional create action", () => {
    expect(
      findUnboundActionIds(postListPath, getActions(postListPath), (source) =>
        source
          .replace("{canCreatePost && (", "{true && (")
          .replace(
            "<DataTable<PostListItemEntity, PostListQueryInput>",
            "<>{canCreatePost && <Button />}</><DataTable<PostListItemEntity, PostListQueryInput>",
          ),
      ),
    ).toContain("post-list.create");
  });

  it("rejects a positive guard used as a disabled condition", () => {
    const settingPath = "(root)/(dashboard)/setting/components/SettingClient/index.tsx";
    const [settingAction] = getActions(settingPath);
    const disabledAction: ActionGuardContract = {
      ...settingAction,
      guard: {
        kind: "attribute",
        attribute: "disabled",
        polarity: "negative",
      },
    };

    expect(
      findUnboundActionIds(settingPath, [disabledAction], (source) =>
        source.replace(
          "renderSubmitButton={canUpdateSetting}",
          "disabled={canUpdateSetting}",
        ),
      ),
    ).toEqual(["setting.update"]);
  });

  it("rejects one unguarded submit among matching post update controls", () => {
    const editorPath =
      "(root)/(dashboard)/post/edit/components/PostEditorActions/index.tsx";

    expect(
      findUnboundActionIds(editorPath, getActions(editorPath), (source) =>
        source.replace(
          "{canUpdatePost && isEdit && isPublished && (",
          "{true && isEdit && isPublished && (",
        ),
      ),
    ).toContain("post-editor.update");
  });

  it("rejects an unguarded batch delete while row delete stays guarded", () => {
    const linkPath = "(root)/(dashboard)/link/components/LinkPageShell/index.tsx";

    expect(
      findUnboundActionIds(linkPath, getActions(linkPath), (source) =>
        source.replace(
          "{canDeleteLink && (\n                <Dialog",
          "{true && (\n                <Dialog",
        ),
      ),
    ).toContain("link.delete-batch");
  });

  it("rejects an unguarded add-tag entry while remove-tag stays guarded", () => {
    const multiTagPath =
      "(root)/(dashboard)/post/edit/components/MultiTag/index.tsx";

    expect(
      findUnboundActionIds(multiTagPath, getActions(multiTagPath), (source) =>
        source.replace(
          "{canManagePostTags && (\n        <Popover",
          "{true && (\n        <Popover",
        ),
      ),
    ).toContain("post-tags.add");
  });

  it.each(actionGuardMatrix)(
    "$relativePath binds each permission to its named action",
    ({ relativePath, actions }) => {
      expect(findUnboundActionIds(relativePath, actions)).toEqual([]);
    },
  );
});
