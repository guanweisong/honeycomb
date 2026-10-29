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
    files: [
      // Reset pending navigation after the route commits.
      "src/app/(blog)/components/Menu/index.tsx",
      // Hydrate browser-owned dashboard preferences after SSR.
      "src/app/admin/(dashboard)/components/AdminClientShell/index.tsx",
      // Hydrate and reconcile stored layout preferences without changing SSR markup.
      "src/app/admin/components/AdminLayout/index.tsx",
      // Synchronize controlled menu selection with a committed route.
      "src/app/admin/components/AdminNavigation/index.tsx",
      // Restore browser-owned guest identity after hydration.
      "src/features/comment/public/components/hooks/use-comment-identity.ts",
      // Clear picker selection when an externally controlled session closes.
      "src/features/media/admin/components/PhotoPicker/index.tsx",
      // Accumulate key-scoped external query pages; do not drop prior pages on a new response.
      "src/features/media/admin/media-query.ts",
      // Adopt a newer server snapshot only while the editor is pristine.
      "src/features/menu/admin/use-menu-tree-editor.ts",
      // Reset pending state when the editor identity changes; stale completions stay guarded.
      "src/features/page/admin/edit/page-editor-actions.ts",
      // Reconcile external identity and confirmed server snapshots without overwriting dirty drafts.
      "src/features/post/admin/edit/hooks/use-post-editor.tsx",
      // Synchronize the external authentication SDK passkey snapshot.
      "src/features/user/admin/account-security/components/PasskeySettings/index.tsx",
      // Reconcile browser identity and authentication state after hydration.
      "src/features/user/login/components/LoginClient/index.tsx",
      // Expose an explicit SSR-safe hydration boundary.
      "src/lib/hooks/use-mounted.ts",
    ],
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
