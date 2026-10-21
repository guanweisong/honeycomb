import { expect, it } from "vitest";
import ts from "typescript";
import { sourceFile } from "@tests/helpers/source-files";

it("closes the competing media test client even if pending deletion rejects", () => {
  const file = sourceFile(
    "src/features/media/server/registration.integration.test.ts",
  );
  const protectedCloses: ts.TryStatement[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isTryStatement(node) &&
      node.tryBlock.getText().includes("await deletion;") &&
      node.finallyBlock?.getText().includes("competingClient.close();") &&
      !node.finallyBlock.getText().includes("await deletion;")
    )
      protectedCloses.push(node);
    ts.forEachChild(node, visit);
  }
  visit(file);
  expect(protectedCloses).toHaveLength(1);
});
