import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sourceFiles } from "@tests/helpers/source-files";

const appRoot = join(process.cwd(), "src", "app");

const appFiles = sourceFiles(appRoot);

function componentDirectories(): string[] {
  return appFiles
    .filter((path) => /\/components\/[^/]+\/index\.tsx$/.test(path))
    .map((path) => path.slice(0, -"/index.tsx".length));
}

describe("App Router composition boundaries", () => {
  it("keeps admin routing directly under admin without a pass-through root group", () => {
    expect(existsSync(join(appRoot, "admin/(root)"))).toBe(false);
    for (const route of [
      "login/page.tsx",
      "forbidden/page.tsx",
      "(dashboard)/layout.tsx",
      "(dashboard)/template.tsx",
    ]) {
      expect(existsSync(join(appRoot, "admin", route)), route).toBe(true);
    }
  });

  it.each(["post", "page"])(
    "owns the %s root redirect without a feature shell",
    (feature) => {
      expect(
        existsSync(
          join(process.cwd(), "src/features", feature, "admin/page.tsx"),
        ),
      ).toBe(false);
    },
  );

  it("keeps business admin routes as composition of feature-owned pages", () => {
    const pages = appFiles.filter(
      (path) => path.includes("/(dashboard)/") && path.endsWith("/page.tsx"),
    );
    expect(pages.length).toBeGreaterThan(10);
    for (const path of pages) {
      const source = readFileSync(path, "utf8");
      const route = relative(appRoot, path);
      const redirectTarget = new Map([
        ["admin/(dashboard)/post/page.tsx", "/admin/post/list"],
        ["admin/(dashboard)/page/page.tsx", "/admin/page/list"],
      ]).get(route);
      if (redirectTarget) {
        // Only these two framework-owned redirects may omit a feature page.
        expect(source, route).toContain('"use client"');
        expect(source, route).toContain(`router.replace("${redirectTarget}")`);
        expect(source, route).toContain("useLayoutEffect");
        const imports = [...source.matchAll(/from ["']([^"']+)["']/g)].map(
          (match) => match[1],
        );
        expect(imports, route).toEqual(["next/navigation", "react"]);
      } else {
        expect(source, route).toMatch(/from ["']@\/features\//);
      }
      expect(source, relative(process.cwd(), path)).not.toMatch(
        /\b(?:useState|useReducer|useMutation|useQuery)\s*\(|(?:ctx\.)?db\.(?:insert|update|delete)\s*\(/,
      );
    }
  });

  it("keeps app shell entrypoints covered without prescribing TSX test syntax", () => {
    const missingTests = componentDirectories()
      .filter(
        (directory) =>
          !["index.test.ts", "index.test.tsx"].some((file) =>
            existsSync(join(directory, file)),
          ),
      )
      .map((directory) => relative(process.cwd(), directory));
    expect(missingTests).toEqual([]);
  });

  it("allows cohesive shell helper components but keeps business editors and CRUD UI in features", () => {
    const businessComponents = appFiles.filter((path) =>
      /\/(?:AddCategoryModal|PhotoPicker|PostEditorActions|PageEditorActionButtons|CommentPageShell|MediaPageShell|LinkPageShell|UserPageShell|PostInfo|Tags|ViewTracker|RichText)\//.test(
        path,
      ),
    );
    expect(businessComponents).toEqual([]);
    const invalidDirectories = componentDirectories()
      .filter(
        (directory) =>
          !/^[A-Z][A-Za-z0-9]*$/.test(directory.split("/").at(-1) ?? ""),
      )
      .map((directory) => relative(process.cwd(), directory));
    expect(invalidDirectories).toEqual([]);
    expect(
      existsSync(
        join(appRoot, "admin/components/AdminLayout/AdminSidebar.tsx"),
      ),
    ).toBe(true);
  });
});

describe("App Router 恢复与 viewport 边界", () => {
  it("provides a root not-found page", () => {
    expect(existsSync(join(appRoot, "not-found.tsx"))).toBe(true);
  });

  it("does not prevent zoom in the admin root layout", () => {
    const source = readFileSync(join(appRoot, "admin", "layout.tsx"), "utf8");

    expect(source).toContain("export const viewport");
    expect(source).not.toMatch(/maximumScale|userScalable|user-scalable/);
  });

  it("provides public metadata defaults at the locale root", () => {
    const source = readFileSync(
      join(appRoot, "(blog)", "[locale]", "layout.tsx"),
      "utf8",
    );

    expect(source).toContain("export async function generateMetadata");
    expect(source).toContain("getPublicSetting");
    expect(source).toContain("metadataBase");
    expect(source).toContain("openGraph");
    expect(source).toContain("twitter");
    expect(source).toContain("defaultSocialImage");
  });
});
