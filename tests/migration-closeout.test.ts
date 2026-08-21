import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const coreContracts = [
  "src/features/post/application/repository.ts",
  "src/features/comment/application/repository.ts",
  "src/features/comment/application/comment-use-cases.ts",
  "src/features/user/ports.ts",
];

describe("DDD migration closeout", () => {
  it("does not expose explicit any from core feature contracts", () => {
    const violations = coreContracts.flatMap((relativePath) => {
      const source = readFileSync(relativePath, "utf8");
      return /\bany\b|no-explicit-any/.test(source) ? [relativePath] : [];
    });

    expect(violations).toEqual([]);
  });
});
