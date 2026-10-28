import { requireDefined } from "@tests/helpers/require-defined";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  actionGuardMatrix,
  type ActionControlIdentity,
  type ActionGuardContract,
  type GuardPolarity,
} from "@tests/helpers/admin-action-guard-matrix";
import { Permission } from "@/lib/auth/permissions";

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
  if (initializer && ts.isStringLiteral(initializer)) return initializer;
  return initializer &&
    ts.isJsxExpression(initializer) &&
    initializer.expression
    ? initializer.expression
    : undefined;
}

type ActionBranchFact = NonNullable<ActionGuardContract["when"]>;

function hasGuardPolarity(
  node: ts.Node,
  guardName: string,
  polarity: GuardPolarity,
  actionBranch?: ActionBranchFact,
): boolean {
  function enclosingFunction(target: ts.Node): ts.Node | undefined {
    for (let ancestor = target.parent; ancestor; ancestor = ancestor.parent) {
      if (ts.isFunctionLike(ancestor)) return ancestor;
    }
    return undefined;
  }
  const scope = enclosingFunction(node);
  const aliases = new Map<string, ts.Expression>();
  function findAliases(target: ts.Node): void {
    if (
      ts.isVariableDeclaration(target) &&
      ts.isIdentifier(target.name) &&
      target.initializer &&
      ts.isVariableDeclarationList(target.parent) &&
      (target.parent.flags & ts.NodeFlags.Const) !== 0 &&
      enclosingFunction(target) === scope &&
      ts.isVariableStatement(target.parent.parent) &&
      containsNode(target.parent.parent.parent, node) &&
      target.end < node.pos
    )
      aliases.set(target.name.text, target.initializer);
    ts.forEachChild(target, findAliases);
  }
  if (scope) findAliases(scope);

  // Prove that the action-enabling value is impossible when permission is false.
  // Unknown expressions stay unknown; merely mentioning a guard is not proof.
  function cannotHaveValue(
    expression: ts.Node,
    value: boolean,
    seen = new Set<string>(),
  ): boolean {
    const cannot = (branch: ts.Node, desired = value) =>
      cannotHaveValue(branch, desired, seen);
    if (ts.isParenthesizedExpression(expression))
      return cannot(expression.expression);
    if (ts.isIdentifier(expression)) {
      if (expression.text === guardName) return value;
      if (expression.text === "undefined") return value;
      if (actionBranch && expression.text === actionBranch.name)
        return actionBranch.value !== value;
      const initializer = aliases.get(expression.text);
      if (!initializer || seen.has(expression.text)) return false;
      return cannotHaveValue(
        initializer,
        value,
        new Set([...seen, expression.text]),
      );
    }
    if (
      expression.kind === ts.SyntaxKind.TrueKeyword ||
      ts.isArrowFunction(expression) ||
      ts.isFunctionExpression(expression)
    )
      return !value;
    if (
      expression.kind === ts.SyntaxKind.FalseKeyword ||
      expression.kind === ts.SyntaxKind.NullKeyword
    )
      return value;
    if (
      ts.isPrefixUnaryExpression(expression) &&
      expression.operator === ts.SyntaxKind.ExclamationToken
    )
      return cannot(expression.operand, !value);
    if (ts.isConditionalExpression(expression))
      return (
        (cannot(expression.condition, true) || cannot(expression.whenTrue)) &&
        (cannot(expression.condition, false) || cannot(expression.whenFalse))
      );
    if (!ts.isBinaryExpression(expression)) return false;
    if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
      return value
        ? cannot(expression.left) || cannot(expression.right)
        : cannot(expression.left) && cannot(expression.right);
    if (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken)
      return value
        ? cannot(expression.left) && cannot(expression.right)
        : cannot(expression.left) || cannot(expression.right);
    return false;
  }
  return cannotHaveValue(node, polarity === "positive");
}

function containsNode(container: ts.Node, target: ts.Node): boolean {
  return container.pos <= target.pos && container.end >= target.end;
}

function isGuardedByAncestor(
  target: ts.Node,
  guardName: string,
  polarity: GuardPolarity,
  actionBranch?: ActionBranchFact,
): boolean {
  for (let ancestor = target.parent; ancestor; ancestor = ancestor.parent) {
    if (
      ts.isBinaryExpression(ancestor) &&
      ancestor.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      containsNode(ancestor.right, target) &&
      hasGuardPolarity(ancestor.left, guardName, polarity, actionBranch)
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
        hasGuardPolarity(
          ancestor.condition,
          guardName,
          branchPolarity,
          actionBranch,
        )
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
  if (identity.expression !== undefined)
    return expression.getText(sourceFile) === identity.expression;
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
        const value =
          Permission[permission.name.text as keyof typeof Permission];
        guardByPermission.set(value ?? permission.name.text, node.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return guardByPermission;
}

/** Only a direct, parameterless action callback can supply a branch fact. */
function getActionBranchFact(
  control: ts.JsxElement | ts.JsxSelfClosingElement,
  identity: ActionControlIdentity,
  sourceFile: ts.SourceFile,
): ActionBranchFact | undefined {
  if (!identity.call?.argument) return undefined;
  const element = ts.isJsxElement(control) ? control.openingElement : control;
  const callback = getAttributeExpression(element, identity.attribute);
  if (
    !callback ||
    !ts.isArrowFunction(callback) ||
    callback.parameters.length !== 0 ||
    !ts.isCallExpression(callback.body) ||
    callback.body.expression.getText(sourceFile) !== identity.call.callee
  )
    return undefined;
  for (const argument of callback.body.arguments) {
    if (
      !ts.isConditionalExpression(argument) ||
      !ts.isIdentifier(argument.condition)
    )
      continue;
    const whenTrue =
      argument.whenTrue.getText(sourceFile) === identity.call.argument;
    const whenFalse =
      argument.whenFalse.getText(sourceFile) === identity.call.argument;
    if (whenTrue !== whenFalse)
      return { name: argument.condition.text, value: whenTrue };
  }
  return undefined;
}

function findUnboundActionIds(
  sourcePath: string,
  actions: readonly ActionGuardContract[],
  transformSource: (source: string) => string = (source) => source,
): string[] {
  const fileName = join(process.cwd(), sourcePath);
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
              getActionBranchFact(control, action.control, sourceFile) ??
                action.when,
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

function getActions(sourcePath: string): readonly ActionGuardContract[] {
  return actionGuardMatrix.find((entry) => entry.sourcePath === sourcePath)!
    .actions;
}

describe("admin action capability guards", () => {
  const postListPath =
    "src/features/post/admin/list/components/PostListClient/index.tsx";

  it.each([
    ["canDelete || true", "positive", false],
    ["!canDelete && false", "negative", false],
    ["canDelete || busy", "positive", false],
    ["!canDelete && busy", "negative", false],
    ["canDelete && !busy", "positive", true],
    ["!canDelete || busy", "negative", true],
    ["!(canDelete && !busy)", "negative", true],
    ["canDelete || !canDelete", "positive", false],
    ["canDelete ? true : true", "positive", false],
    ["canDelete ? false : false", "negative", false],
    ["canDelete ? true : false", "positive", true],
    ["canDelete ? false : true", "negative", true],
  ] as const)(
    "checks logical permission implication for %s",
    (expression, polarity, expected) => {
      const source = ts.createSourceFile(
        "guard.ts",
        `const value = ${expression};`,
        ts.ScriptTarget.Latest,
        true,
      );
      const statement = source.statements[0];
      if (!statement || !ts.isVariableStatement(statement))
        throw new Error("Expected declaration");
      const node = requireDefined(
        statement.declarationList.declarations[0]?.initializer,
      );
      expect(hasGuardPolarity(node, "canDelete", polarity)).toBe(expected);
    },
  );

  it.each([
    ["post", postListPath, "Post"],
    ["page", "src/features/page/admin/list/page.tsx", "Page"],
  ])(
    "rejects removed or swapped %s navigation guards",
    (feature, path, suffix) => {
      const actions = getActions(path);
      const removed = findUnboundActionIds(path, actions, (source) =>
        source
          .replaceAll(`canCreate${suffix} &&`, "true &&")
          .replaceAll(`canUpdate${suffix} &&`, "true &&"),
      );
      const swapped = findUnboundActionIds(path, actions, (source) =>
        source
          .replaceAll(`canCreate${suffix} &&`, "swappedGuard &&")
          .replaceAll(`canUpdate${suffix} &&`, `canCreate${suffix} &&`)
          .replaceAll("swappedGuard &&", `canUpdate${suffix} &&`),
      );
      for (const unbound of [removed, swapped]) {
        expect(unbound).toContain(`${feature}-list.create`);
        expect(unbound).toContain(`${feature}-list.update`);
      }
      const wrongHref = findUnboundActionIds(path, actions, (source) =>
        source.replaceAll(`/admin/${feature}/edit`, "/admin/other/edit"),
      );
      expect(wrongHref).toContain(`${feature}-list.create`);
      expect(wrongHref).toContain(`${feature}-list.update`);
    },
  );

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
    const settingPath =
      "src/features/setting/admin/components/SettingClient/index.tsx";
    const [settingAction] = getActions(settingPath);
    const disabledAction: ActionGuardContract = {
      ...requireDefined(settingAction),
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
      "src/features/post/admin/edit/components/PostEditorActions/index.tsx";

    expect(
      findUnboundActionIds(editorPath, getActions(editorPath), (source) =>
        source.replace(
          "{canUpdatePost && isEdit && isPublished && (",
          "{true && isEdit && isPublished && (",
        ),
      ),
    ).toContain("post-editor.update");
  });

  it.each([
    "true && isEdit && (isDraft || isAwaitingAudit)",
    "canUpdatePost || (isEdit && (isDraft || isAwaitingAudit))",
  ])(
    "rejects a derived save guard that does not require update permission: %s",
    (replacement) => {
      const editorPath =
        "src/features/post/admin/edit/components/PostEditorActions/index.tsx";
      expect(
        findUnboundActionIds(editorPath, getActions(editorPath), (source) =>
          source.replace(
            "canUpdatePost && isEdit && (isDraft || isAwaitingAudit)",
            replacement,
          ),
        ),
      ).toContain("post-editor.update");
    },
  );

  it.each([
    ["save", "{canSaveUnpublished && (", "{(canSaveUnpublished || true) && ("],
    [
      "publish",
      "{(canSaveUnpublished || (canCreatePost && !isEdit)) && (",
      "{(canSaveUnpublished || true) && (",
    ],
    [
      "swapped publish action",
      'isEdit ? "update" : "create"',
      'isEdit ? "create" : "update"',
    ],
  ])("rejects an alias bypass at the %s use site", (_label, before, after) => {
    const editorPath =
      "src/features/post/admin/edit/components/PostEditorActions/index.tsx";
    expect(
      findUnboundActionIds(editorPath, getActions(editorPath), (source) => {
        expect(source).toContain(before);
        return source.replace(before, after);
      }),
    ).toContain("post-editor.update");
  });

  it.each([
    [
      "canUpdatePage && isEdit && isDraft",
      "isEdit && isDraft",
      "page-editor.update-publish",
    ],
    ["canCreatePage && !isEdit", "!isEdit", "page-editor.create-publish"],
  ])(
    "rejects a shared publish button bypass in its declared mode: %s",
    (before, after, action) => {
      const path =
        "src/features/page/admin/edit/components/PageEditorActionButtons/index.tsx";
      expect(
        findUnboundActionIds(path, getActions(path), (source) => {
          expect(source).toContain(before);
          return source.replaceAll(before, after);
        }),
      ).toContain(action);
    },
  );

  it("rejects an unguarded batch delete while row delete stays guarded", () => {
    const linkPath =
      "src/features/link/admin/components/LinkPageShell/index.tsx";

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
      "src/features/post/admin/edit/components/MultiTag/index.tsx";

    expect(
      findUnboundActionIds(multiTagPath, getActions(multiTagPath), (source) =>
        source.replace(
          "{canManagePostTags && (\n        <Popover",
          "{true && (\n        <Popover",
        ),
      ),
    ).toContain("post-tags.add");
  });

  it("keeps relocated category actions bound to their own capability guards", () => {
    const categoryPath = "src/features/category/admin/page.tsx";
    expect(
      findUnboundActionIds(categoryPath, getActions(categoryPath), (source) =>
        source.replaceAll("{canCreateCategory && (", "{true && ("),
      ),
    ).toContain("category.create");
  });

  it("rejects an unguarded post-sidebar category callback", () => {
    const sidebarPath =
      "src/features/post/admin/edit/components/PostSidebarFields/index.tsx";
    const actions = getActions(sidebarPath);
    expect(findUnboundActionIds(sidebarPath, actions)).toEqual([]);
    expect(
      findUnboundActionIds(sidebarPath, actions, (source) => {
        expect(source).toContain("{canCreateCategory && (");
        return source.replace("{canCreateCategory && (", "{true && (");
      }),
    ).toEqual(["post-sidebar.create-category"]);
  });

  it.each(actionGuardMatrix)(
    "$sourcePath binds each permission to its named action",
    ({ sourcePath, actions }) => {
      expect(findUnboundActionIds(sourcePath, actions)).toEqual([]);
    },
  );
});
