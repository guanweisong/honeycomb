import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/immutability": "error",
    },
  },
  {
    // Reset pending navigation after the route commits.
    files: ["src/app/(blog)/_components/Menu/index.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Hydrate browser-owned dashboard preferences after SSR.
    files: ["src/app/admin/(dashboard)/_components/AdminClientShell/index.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Hydrate and reconcile stored layout preferences without changing SSR markup.
    files: ["src/app/admin/_components/AdminLayout/index.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Synchronize controlled menu selection with a committed route.
    files: ["src/app/admin/_components/AdminNavigation/index.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Read external editor selection when the link dialog changes.
    files: ["src/components/editor/components/ToolbarLinkItem.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Restore browser-owned guest identity after hydration.
    files: [
      "src/features/comment/public/components/hooks/use-comment-identity.ts",
    ],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Clear picker selection when an externally controlled session closes.
    files: ["src/features/media/admin/components/PhotoPicker/index.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Accumulate key-scoped external query pages; do not drop prior pages on a new response.
    files: ["src/features/media/admin/media-query.ts"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Adopt a newer server snapshot only while the editor is pristine.
    files: ["src/features/menu/admin/use-menu-tree-editor.ts"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Reset pending state when the editor identity changes; stale completions stay guarded.
    files: ["src/features/page/admin/edit/page-editor-actions.ts"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Reconcile external identity and confirmed server snapshots without overwriting dirty drafts.
    files: ["src/features/post/admin/edit/hooks/use-post-editor.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Synchronize the external authentication SDK passkey snapshot.
    files: [
      "src/features/user/admin/account-security/components/PasskeySettings/index.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Reconcile browser identity and authentication state after hydration.
    files: ["src/features/user/login/components/LoginClient/index.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Expose an explicit SSR-safe hydration boundary.
    files: ["src/lib/hooks/use-mounted.ts"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "**/*.test.*",
      "**/*.spec.*",
      "**/*-test-helpers.ts",
      "**/capability-procedure-matrix-*.ts",
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
    },
  },
  {
    files: [
      "src/lib/observability/adapters/console.ts",
      "src/lib/observability/adapters/console-metrics.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "**/.next/**",
    ".compare-head/**",
    ".worktrees/**",
    "worktrees/**",
    ".open-next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "public/sw.js",
    "public/sw.js.map",
    "public/serwist/**",
    ".serwist-build/**",
    "public/workbox-*.js",
    "public/workbox-*.js.map",
    "next-env.d.ts",
  ]),
]);
