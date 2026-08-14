import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const appRoot = join(process.cwd(), "src", "app");

const routeFiles = new Set([
  "page.tsx",
  "layout.tsx",
  "loading.tsx",
  "error.tsx",
  "global-error.tsx",
  "not-found.tsx",
  "default.tsx",
]);

function filesIn(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return filesIn(path);
    return [path];
  });
}

function componentFiles(): string[] {
  return filesIn(appRoot).filter((path) => {
    if (!path.endsWith(".tsx") || path.includes(`${join("src", "app", "api")}`)) {
      return false;
    }

    const segments = relative(appRoot, path).split("/");
    const fileName = segments.at(-1) ?? "";
    if (routeFiles.has(fileName)) return false;
    if (["Providers.tsx", "AdminProviders.tsx"].includes(fileName)) return false;
    if (["constants", "hooks", "lib", "types", "utils"].some((name) => segments.includes(name))) {
      return false;
    }
    return !segments.includes("components") && /^[A-Z]/.test(fileName);
  });
}

function componentDirectories(): string[] {
  return filesIn(appRoot)
    .filter((path) => /\/components\/[^/]+\/index\.tsx$/.test(path))
    .map((path) => path.slice(0, -"/index.tsx".length));
}

function componentDirectoryViolations(): string[] {
  return componentDirectories().flatMap((directory) => {
    const componentName = directory.split("/").at(-1) ?? "";
    const violations = /^[A-Z][A-Za-z0-9]*$/.test(componentName)
      ? []
      : [`${relative(process.cwd(), directory)}: 组件目录必须使用大驼峰`];

    return readdirSync(directory)
      .filter((entry) => entry.endsWith(".tsx") && !["index.tsx", "index.test.tsx"].includes(entry))
      .map((entry) => `${relative(process.cwd(), join(directory, entry))}: 组件目录只能保留 index.tsx`)
      .concat(violations);
  });
}

describe("App Router 业务组件目录约束", () => {
  it("业务组件必须位于业务目录下的 components/组件名/index.tsx", () => {
    expect(componentFiles().map((path) => relative(process.cwd(), path))).toEqual([]);
  });

  it("每个组件目录必须配套 index.test.tsx", () => {
    const missingTests = componentDirectories()
      .filter((directory) => !existsSync(join(directory, "index.test.tsx")))
      .map((directory) => relative(process.cwd(), directory));

    expect(missingTests).toEqual([]);
  });

  it("组件目录必须使用大驼峰且只保留标准入口文件", () => {
    expect(componentDirectoryViolations()).toEqual([]);
  });
});
