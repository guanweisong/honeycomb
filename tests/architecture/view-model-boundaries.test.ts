// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sourceFiles } from "@tests/helpers/source-files";

const scopes = [
  {
    name: "App Router",
    roots: ["src/app/(blog)", "src/app/lib"],
    paths: ["/"],
  },
  {
    name: "Comment",
    roots: ["src/features/comment"],
    paths: ["/admin/", "/public/", "/presentation/"],
  },
  {
    name: "Post",
    roots: ["src/features/post"],
    paths: [
      "/public/",
      "/presentation/",
      "/admin/edit/hooks/use-post-editor",
      "/admin/edit/components/PhotoPickerItem",
      "/admin/list/components/PostListClient",
      "/admin/list/constants/post-list-table-columns",
    ],
  },
  {
    name: "Other features",
    roots: ["link", "tag", "page", "user"].map(
      (feature) => `src/features/${feature}`,
    ),
    paths: ["/admin/", "/presentation/"],
  },
];
const transportOutput =
  /(?:lib\/trpc\/outputs|app\/_trpc\/router|inferRouterOutputs)/;

describe("View Model boundaries", () => {
  it.each(scopes)(
    "$name presentation does not depend on tRPC outputs",
    ({ roots, paths }) => {
      const files = roots
        .flatMap((root) =>
          sourceFiles(join(process.cwd(), root), { includeTests: true }),
        )
        .filter((path) => paths.some((fragment) => path.includes(fragment)));
      expect(files.length).toBeGreaterThan(0);
      expect(
        files
          .filter((path) => transportOutput.test(readFileSync(path, "utf8")))
          .map((path) => relative(process.cwd(), path)),
      ).toEqual([]);
    },
  );

  it.each(["lib/trpc/outputs", "app/_trpc/router", "inferRouterOutputs"])(
    "rejects %s references",
    (reference) => {
      expect(
        transportOutput.test(`import type { Output } from "@/${reference}";`),
      ).toBe(true);
    },
  );
});
