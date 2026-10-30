// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

describe("React lint policy", () => {
  it("enforces effect and mutation checks outside documented file exceptions", async () => {
    const eslint = new ESLint();
    const config = await eslint.calculateConfigForFile(
      "src/components/Button/index.tsx",
    );
    expect(config.rules["react-hooks/set-state-in-effect"][0]).toBe(2);
    expect(config.rules["react-hooks/immutability"][0]).toBe(2);
  }, 30_000);

  it("keeps the precise documented exception list without weakening other rules", async () => {
    const eslint = new ESLint();
    for (const file of [
      "src/app/(blog)/components/Menu/index.tsx",
      "src/app/admin/(dashboard)/components/AdminClientShell/index.tsx",
      "src/app/admin/components/AdminLayout/index.tsx",
      "src/app/admin/components/AdminNavigation/index.tsx",
      "src/app/(blog)/components/features/comment/public/components/hooks/use-comment-identity.ts",
      "src/app/admin/(dashboard)/components/PhotoPicker/index.tsx",
      "src/app/admin/(dashboard)/media/components/media-query.ts",
      "src/app/admin/(dashboard)/menu/components/use-menu-tree-editor.ts",
      "src/app/admin/(dashboard)/page/edit/page-editor-actions.ts",
      "src/app/admin/(dashboard)/post/edit/components/hooks/use-post-editor.tsx",
      "src/app/admin/(dashboard)/account/security/components/PasskeySettings/index.tsx",
      "src/app/admin/login/components/LoginClient/index.tsx",
      "src/lib/hooks/use-mounted.ts",
    ]) {
      const config = await eslint.calculateConfigForFile(file);
      expect(config.rules["react-hooks/set-state-in-effect"][0], file).toBe(0);
      expect(config.rules["react-hooks/immutability"][0], file).toBe(2);
      expect(config.rules["no-console"][0], file).toBe(2);
      expect(
        config.rules["@typescript-eslint/no-unsafe-assignment"][0],
        file,
      ).toBe(2);
    }
  }, 30_000);

  it("reports illegal effect state updates and prop mutation in real lint fixtures", async () => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText(
      `
      import { useEffect, useState } from "react";
      export function IllegalEffect() {
        const [value, setValue] = useState(0);
        useEffect(() => { setValue(1); }, []);
        return <div>{value}</div>;
      }
      export function IllegalMutation({ user }) {
        user.name = "new";
        return <div>{user.name}</div>;
      }
    `,
      { filePath: "src/components/audit-lint-probe.jsx" },
    );
    if (!result) throw new Error("ESLint did not return a fixture result");
    const rules = result.messages.map((message) => message.ruleId);
    expect(rules).toContain("react-hooks/set-state-in-effect");
    expect(rules).toContain("react-hooks/immutability");
  }, 30_000);
});
