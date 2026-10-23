// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import tailwindcss from "@tailwindcss/postcss";
import ts from "typescript";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";
const css = postcss.parse(readFileSync("src/app/styles/globals.css", "utf8"));
describe("editor task-list theme tokens", () => {
  it("uses complete CSS colors directly for checkbox accent and checked text", () => {
    const values: string[] = [];
    css.walkDecls(/^(accent-color|color)$/, (declaration) => {
      if (
        declaration.value.includes("--primary") ||
        declaration.value.includes("--muted-foreground")
      )
        values.push(declaration.value);
    });
    expect(values).toContain("var(--primary)");
    expect(values).toContain("var(--muted-foreground)");
    expect(values.some((value) => value.startsWith("hsl(var("))).toBe(false);
    const checked: string[] = [];
    css.walkRules(
      '.prose-editor ul[data-type="taskList"] li[data-checked="true"] > div',
      (rule) => {
        checked.push(rule.toString());
      },
    );
    expect(checked).toHaveLength(1);
    expect(checked[0]).toContain("line-through");
  });
});

// Compile actual component candidates, rather than asserting which plugin is named.
// This catches utility precedence changes when animation dependencies are removed.
describe("compiled UI animation contract", () => {
  let compiled: postcss.Root;
  const candidates = new Set<string>([
    "motion-reduce:animate-none",
    "motion-reduce:transition-none",
  ]);

  beforeAll(async () => {
    for (const file of readdirSync("src/components/ui").filter((file) =>
      file.endsWith(".tsx"),
    )) {
      const source = ts.createSourceFile(
        file,
        readFileSync(`src/components/ui/${file}`, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node: ts.Node) {
        if (ts.isStringLiteral(node)) {
          for (const candidate of node.text.split(/\s+/)) {
            if (/(animate-|fade-|zoom-|slide-|duration-|ease-)/.test(candidate))
              candidates.add(candidate);
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
    const input =
      css
        .toString()
        .replace(
          '@import "tailwindcss";',
          '@import "tailwindcss" source(none);',
        )
        .replace(/@source[^;]+;/g, "") +
      `\n@source inline(${JSON.stringify([...candidates].join(" "))});`;
    const result = await postcss([tailwindcss({ optimize: false })]).process(
      input,
      { from: "src/app/styles/globals.css" },
    );
    compiled = result.root;
  });

  function declarations(candidate: string) {
    const values: Record<string, string> = {};
    compiled.walkRules((rule) => {
      const selector = rule.selector.replace(/\\(.)/g, "$1");
      const nextCharacter = selector[candidate.length + 1];
      if (
        selector.startsWith(`.${candidate}`) &&
        (!nextCharacter || /[\s[:.,]/.test(nextCharacter))
      ) {
        rule.walkDecls((declaration) => {
          values[declaration.prop] = declaration.value;
        });
      }
    });
    return values;
  }

  it("emits a single enter/exit definition without competing animation implementations", () => {
    const counts: Record<string, number> = {};
    compiled.walkAtRules("keyframes", (rule) => {
      counts[rule.params] = (counts[rule.params] ?? 0) + 1;
    });
    expect(counts.enter).toBe(1);
    expect(counts.exit).toBe(1);
  });

  it.each([
    ["top", "y", "-2.5rem"],
    ["bottom", "y", "2.5rem"],
    ["left", "x", "-2.5rem"],
    ["right", "x", "2.5rem"],
  ])(
    "preserves the Sheet %s displacement in both directions",
    (side, axis, expected) => {
      for (const [state, direction, phase] of [
        ["open", "in-from", "enter"],
        ["closed", "out-to", "exit"],
      ]) {
        const candidate = [...candidates].find((value) =>
          value.startsWith(
            `data-[side=${side}]:data-${state}:slide-${direction}-${side}-`,
          ),
        );
        if (!candidate)
          throw new Error(`Sheet ${side} ${state} animation missing`);
        const value =
          declarations(candidate)[`--tw-${phase}-translate-${axis}`];
        expect(value?.replace(/^calc\(([\d.]+rem)\*-1\)$/, "-$1")).toBe(
          expected,
        );
      }
    },
  );

  it("keeps fade/zoom endpoints and spacing-based menu movement", () => {
    expect(declarations("data-open:fade-in-0")["--tw-enter-opacity"]).toBe("0");
    expect(declarations("data-closed:fade-out-0")["--tw-exit-opacity"]).toBe(
      "0",
    );
    expect(declarations("data-open:zoom-in-95")["--tw-enter-scale"]).toBe(
      ".95",
    );
    expect(declarations("data-closed:zoom-out-95")["--tw-exit-scale"]).toBe(
      ".95",
    );
    expect(
      declarations("data-[side=left]:slide-in-from-right-2")[
        "--tw-enter-translate-x"
      ],
    ).toBe("calc(2*var(--spacing))");
  });

  it("keeps 150ms state animations independent of 100/200ms transitions", () => {
    for (const candidate of [
      "data-open:animate-in",
      "data-closed:animate-out",
      "data-[state=delayed-open]:animate-in",
    ]) {
      const values = declarations(candidate);
      // Before migration, the later state utility forced 150ms regardless of duration-*.
      expect(
        values["--tw-animation-duration"] ?? values["animation-duration"],
      ).toBe("150ms");
      expect(values.animation).toContain("var(--tw-animation-duration");
    }
    expect(declarations("duration-100")["transition-duration"]).toBe("100ms");
    expect(declarations("duration-200")["transition-duration"]).toBe("200ms");
  });

  it("keeps reduced-motion overrides scoped to the user's media preference", () => {
    const overrides: string[] = [];
    compiled.walkAtRules("media", (rule) => {
      if (rule.params === "(prefers-reduced-motion: reduce)")
        overrides.push(rule.toString());
    });
    expect(overrides.join("\n")).toContain("animation: none");
    expect(overrides.join("\n")).toContain("transition-property: none");
    expect(declarations("motion-reduce:animate-none").animation).toBe("none");
    expect(
      declarations("motion-reduce:transition-none")["transition-property"],
    ).toBe("none");
  });
});
