import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

describe("tooling paths after feature ownership migration", () => {
  it("keeps shadcn aliases on existing shared component and library owners", () => {
    const config = JSON.parse(readFileSync("components.json", "utf8")) as {
      aliases: Record<string, string>;
    };
    expect(config.aliases).toMatchObject({
      components: "@/components",
      ui: "@/components/ui",
      hooks: "@/lib/hooks",
      lib: "@/lib",
      utils: "@/lib/ui/utils",
    });
    for (const target of Object.values(config.aliases)) {
      expect(target).not.toContain("src/packages/");
      expect(target).toMatch(/^@\//);
      const directory = target.replace(/^@\//, "src/");
      expect(
        existsSync(directory) || existsSync(`${directory}.ts`),
        target,
      ).toBe(true);
    }
  });

  it("generates import specifiers resolvable by the project TypeScript config", () => {
    const config = JSON.parse(readFileSync("components.json", "utf8"));
    const source = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      source.config,
      ts.sys,
      process.cwd(),
    );
    for (const specifier of [
      `${config.aliases.ui}/button`,
      config.aliases.utils,
    ]) {
      const result = ts.resolveModuleName(
        specifier,
        resolve("src/generated.tsx"),
        parsed.options,
        ts.sys,
      );
      expect(result.resolvedModule, specifier).toBeDefined();
    }
  });

  it("keeps explicit Tailwind sources real and legacy configuration opt-in", () => {
    const path = "src/app/styles/globals.css";
    const css = readFileSync(path, "utf8");
    for (const match of css.matchAll(/@source\s+["']([^"']+)["']/g)) {
      const source = match[1]!;
      const directory = source.split("*")[0]!;
      expect(existsSync(resolve(dirname(path), directory)), source).toBe(true);
    }
    // Tailwind 4 uses CSS configuration; an unreferenced legacy JS/TS file is inert.
    if (existsSync("tailwind.config.ts") || existsSync("tailwind.config.js")) {
      expect(css).toMatch(/@config\s+["'][^"']*tailwind\.config\./);
    }
  });
});
