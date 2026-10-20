// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  featureInventory,
  isAuthoritativeContract,
} from "@tests/helpers/feature-inventory";
import { sourceFiles } from "@tests/helpers/source-files";
import {
  localModulePath,
  moduleDependencies,
} from "@tests/helpers/architecture-imports";

function invalidContractDependencies(path: string, source: string) {
  return moduleDependencies(source, path).flatMap(({ specifier }) => {
    const target = localModulePath(path, specifier);
    return target &&
      (/^src\/(?:app|components)\//.test(target) ||
        /\/(?:server|admin|public|notifications)(?:\/|$)|(?:\/|\.)router$/.test(
          target,
        ))
      ? [specifier]
      : [];
  });
}

describe("direct reading paths and contract ownership", () => {
  it("consumers reach feature-owned contracts without a central forwarding layer", () => {
    expect(existsSync("src/features/contracts")).toBe(false);
    const violations = sourceFiles("src").flatMap((path) =>
      moduleDependencies(readFileSync(path, "utf8"), path)
        .filter(({ specifier }) =>
          localModulePath(path, specifier)?.startsWith(
            "src/features/contracts",
          ),
        )
        .map(({ specifier }) => `${path} -> ${specifier}`),
    );
    expect(violations).toEqual([]);
  });

  it("detects providers, runtime operations and wildcard business exports hidden in data contracts", () => {
    const source = [
      'export { CurrentUserProvider } from "@/features/user/admin/use-current-user";',
      'export { getCurrentUser } from "./server/user-queries";',
      'export * from "@/features/user/server";',
      'export { MediaRecordSchema } from "@/features/media/types";',
      'export type { CurrentUserRecord } from "./types";',
    ].join("\n");
    expect(
      invalidContractDependencies("src/features/user/schema.ts", source),
    ).toEqual([
      "@/features/user/admin/use-current-user",
      "./server/user-queries",
      "@/features/user/server",
    ]);
  });

  it("keeps authoritative feature schemas and types free of UI/request runtime", () => {
    const contracts = featureInventory("src/features")
      .flatMap(({ files }) => files)
      .filter(isAuthoritativeContract);
    expect(contracts.length).toBeGreaterThan(0);
    expect(contracts.toSorted()).toEqual(
      sourceFiles("src/features").filter(isAuthoritativeContract),
    );
    expect(
      contracts.flatMap((path) =>
        invalidContractDependencies(path, readFileSync(path, "utf8")).map(
          (specifier) => `${path} -> ${specifier}`,
        ),
      ),
    ).toEqual([]);
  });

  it("does not retain trivial presentation aliases between consumers and authoritative models", () => {
    for (const feature of ["category", "link", "page", "post", "tag", "user"]) {
      expect(
        existsSync(
          `src/features/${feature}/presentation/${feature}-view-model.ts`,
        ),
        feature,
      ).toBe(false);
    }
  });

  it("comment public UI does not depend on app composition", () => {
    const violations = sourceFiles("src/features/comment/public").flatMap(
      (path) =>
        moduleDependencies(readFileSync(path, "utf8"), path)
          .filter(({ specifier }) =>
            localModulePath(path, specifier)?.startsWith("src/app/"),
          )
          .map(({ specifier }) => `${path} -> ${specifier}`),
    );
    expect(violations).toEqual([]);
  });
});
