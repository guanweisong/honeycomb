// @vitest-environment node

import { describe, it, expect } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { TEST_IDS } from "@tests/helpers/test-constants";
import { sonsTree } from "./tree";

describe("Tools", () => {
  describe("sonsTree", () => {
    it("should return empty array for empty input", () => {
      const result = sonsTree([]);
      expect(result).toEqual([]);
    });

    it("should return root nodes when id is undefined", () => {
      const input = [
        { id: TEST_IDS.ID_1, parent: null },
        { id: TEST_IDS.ID_2, parent: TEST_IDS.ID_1 },
        { id: TEST_IDS.ID_3, parent: null },
      ];
      const result = sonsTree(input);
      expect(result).toHaveLength(3);
      expect(requireDefined(result[0]).deepPath).toBe(0);
      expect(requireDefined(result[1]).deepPath).toBe(1);
      expect(requireDefined(result[2]).deepPath).toBe(0);
    });

    it("should return children of specified parent id", () => {
      const input = [
        { id: TEST_IDS.ID_1, parent: null },
        { id: TEST_IDS.ID_2, parent: TEST_IDS.ID_1 },
        { id: TEST_IDS.ID_3, parent: TEST_IDS.ID_1 },
        { id: TEST_IDS.ID_4, parent: TEST_IDS.ID_2 },
      ];
      const result = sonsTree(input, TEST_IDS.ID_1);
      expect(result).toHaveLength(3);
      expect(requireDefined(result[0]).deepPath).toBe(0);
      expect(requireDefined(result[1]).deepPath).toBe(1);
      expect(requireDefined(result[2]).deepPath).toBe(0);
    });

    it("should handle nested hierarchy", () => {
      const input = [
        { id: TEST_IDS.ID_1, parent: null },
        { id: TEST_IDS.ID_2, parent: TEST_IDS.ID_1 },
        { id: TEST_IDS.ID_3, parent: TEST_IDS.ID_2 },
        { id: TEST_IDS.ID_4, parent: TEST_IDS.ID_3 },
      ];
      const result = sonsTree(input);
      expect(result).toHaveLength(4);
      expect(requireDefined(result[0]).deepPath).toBe(0);
      expect(requireDefined(result[1]).deepPath).toBe(1);
      expect(requireDefined(result[2]).deepPath).toBe(2);
      expect(requireDefined(result[3]).deepPath).toBe(3);
    });

    it("should add deepPath property to each node", () => {
      const input = [
        { id: TEST_IDS.ID_1, parent: null },
        { id: TEST_IDS.ID_2, parent: TEST_IDS.ID_1 },
      ];
      const result = sonsTree(input);
      expect(result[0]).toHaveProperty("deepPath");
      expect(result[1]).toHaveProperty("deepPath");
    });
  });
});

it("preserves depth-first sibling order and mutates the original node references", () => {
  const child = { id: "child", parent: "root", deepPath: 99 };
  const sibling = { id: "sibling", parent: null, deepPath: 99 };
  const root = { id: "root", parent: null, deepPath: 99 };
  const detached = { id: "detached", parent: "absent", deepPath: 99 };
  const input = [child, sibling, root, detached];

  const result = sonsTree(input);

  expect(result.map(({ id, deepPath }) => ({ id, deepPath }))).toEqual([
    { id: "sibling", deepPath: 0 },
    { id: "root", deepPath: 0 },
    { id: "child", deepPath: 1 },
  ]);
  expect(result[0]).toBe(sibling);
  expect(result[1]).toBe(root);
  expect(result[2]).toBe(child);
  expect(input.map(({ deepPath }) => deepPath)).toEqual([1, 0, 0, 99]);
});

it("indexes parent links once for a wide tree while preserving identity and detached nodes", () => {
  let reads = 0;
  const root = {
    id: "root",
    get parent() {
      reads++;
      return null;
    },
  };
  const children = Array.from({ length: 200 }, (_, index) => ({
    id: `child-${index}`,
    get parent() {
      reads++;
      return "root";
    },
  }));
  const detached = {
    id: "detached",
    get parent() {
      reads++;
      return "missing";
    },
  };
  const input = [root, ...children, detached];
  expect(sonsTree(input)).toEqual([root, ...children]);
  expect(reads).toBeLessThanOrEqual(input.length * 2);
  expect(
    sonsTree(input, "root").map(({ id, deepPath }) => ({ id, deepPath })),
  ).toEqual(children.map(({ id }) => ({ id, deepPath: 0 })));
});
