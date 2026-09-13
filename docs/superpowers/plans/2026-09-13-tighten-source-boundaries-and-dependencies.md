# Tighten Source Boundaries and Dependencies Implementation Plan

> **For agentic workers:** This plan is executed inline in the current branch. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove test-only modules and pass-through schema files from production source, remove stale bcryptjs usage, and preserve all application behavior.

**Architecture:** Keep Application write schemas as the single source of truth and make same-Feature consumers import them directly. Keep authorization matrix fixtures and their types under `tests`; leave genuinely distinct menu models and behavior unchanged.

**Tech Stack:** Bun, TypeScript, Vitest, Next.js 16, OpenSpec.

**Spec:** `openspec/changes/tighten-source-boundaries-and-dependencies/`

## Global Constraints

- Do not change tRPC input semantics, database schema, route behavior, permission policy, or authentication configuration.
- Test-only contracts belong under `tests`; production modules must have real runtime consumers.
- Feature write schemas remain owned by `src/features/<feature>/application/write-schema.ts`.
- Keep semantically distinct menu models separate even when names match.

---

### Task 1: Add cleanup regression tests

**Files:**
- Modify: `tests/architecture-complexity.test.ts`
- Modify: `tests/single-source-contracts.test.ts`

**Interfaces:**
- Consumes: Existing `sourceFiles`, `sourceFile`, and the current repository source paths.
- Produces: Failing assertions for known test-only source paths, pass-through schema paths, and the stale runtime dependency.

- [x] Add the 9 `admin-action-guard.ts` paths, `admin-action-guard-types.ts`, and `trpc/api/schemas/i18n.schema.ts` to the obsolete source path assertion.
- [x] Add the 16 re-export-only write schema files and `bcryptjs` to the architecture complexity assertion.
- [x] Run `bun run test:unit:run tests/architecture-complexity.test.ts` and confirm it fails because those paths and the dependency still exist.

### Task 2: Move permission UI matrices into tests

**Files:**
- Create: `tests/fixtures/admin-action-guard-matrix/{comment,link,media,menu,page,post,setting,tag,user}.ts` (flat files)
- Create: `tests/helpers/admin-action-guard-types.ts`
- Modify: `tests/helpers/admin-action-guard-matrix.ts`
- Delete: `src/features/{comment,link,media,menu,page,post,setting,tag,user}/admin/constants/admin-action-guard.ts`
- Delete: `src/packages/identity/auth/admin-action-guard-types.ts`

**Interfaces:**
- Consumes: Feature `Permission` values and test-relative route/component paths.
- Produces: The existing `actionGuardMatrix` export and its structural test types from `tests/helpers/admin-action-guard-matrix.ts`.

- [x] Copy each matrix into the matching test fixture file without changing its ids, permissions, controls, guards, or expected counts.
- [x] Copy the matrix type definitions into `tests/helpers/admin-action-guard-types.ts` and update the aggregator imports to `@tests/fixtures/admin-action-guard-matrix/*` and `@tests/helpers/admin-action-guard-types`.
- [x] Run `bun run test:unit:run tests/capability-entrypoint-boundaries.test.ts src/packages/identity/auth/capability-registry.test.ts tests/admin-client-boundaries.test.ts` and confirm all matrix expectations pass.

### Task 3: Remove the test-only i18n wrapper

**Files:**
- Modify: `tests/shared-contract-behavior.test.ts`
- Modify: `tests/server-only-boundaries.test.ts`
- Delete: `src/packages/trpc/api/schemas/i18n.schema.ts`

**Interfaces:**
- Consumes: `I18nSchema` from `src/packages/application/validation.ts`, and `NullableLocalizedInputSchema` / `PartialLocalizedTextSchema` from the Domain localization module.
- Produces: Existing test coverage of message customization, optionality, nullability, and partial-language behavior without a production wrapper.

- [x] Import the application `I18nSchema` directly and derive the optional test schema as `NullableLocalizedInputSchema.optional()` inside the test module.
- [x] Remove the deleted wrapper from `server-only-boundaries.test.ts` shared contract list and register its path in the architecture obsolete path assertion.
- [x] Run `bun run test:unit:run tests/shared-contract-behavior.test.ts tests/server-only-boundaries.test.ts` and verify the same parsing expectations pass.

### Task 4: Migrate schema consumers and delete pass-through files

**Files:**
- Modify all production and test imports of the 16 files in `src/features/*/schemas/{insert,update}.schema.ts` that only re-export Application schemas.
- Modify: `tests/single-source-contracts.test.ts`
- Delete: the 16 re-export-only schema files listed in `tests/architecture-complexity.test.ts`.

**Interfaces:**
- Consumes: Existing schema exports from each Feature's `application/write-schema.ts`.
- Produces: Direct imports from the authoritative Application source; preserve local aliases `MenuUpdateSchema` → `MenuWriteSchema` and `SettingUpdateSchema` → `SettingAdminUpdateSchema` where callers use those names.

- [x] Search with `rg -n '@/features/.*/schemas/.*(insert|update)\.schema' src tests scripts` and replace only the 16 pass-through specifiers with matching Application write schema specifiers.
- [x] Keep real schema definitions such as list/query, Comment insert, User write, and Post command schemas in place.
- [x] Remove tests whose only assertion is that a deleted wrapper re-exports the Application object; retain behavior and schema composition assertions against the authoritative modules.
- [x] Delete only the 16 files whose statements are all export declarations, then run `bun run test:unit:run tests/single-source-contracts.test.ts tests/bounded-write-contracts.test.ts tests/write-contract-behavior.test.ts tests/url-media-policy.test.ts`.

### Task 5: Remove stale bcryptjs usage and documentation

**Files:**
- Modify: `src/packages/trpc/api/capability-procedure-matrix.test.ts`
- Modify: `tests/helpers/capability-procedure-matrix-data.ts`
- Modify: `tests/helpers/capability-procedure-matrix-test-helpers.ts`
- Modify: `package.json`, `bun.lock`, `README.md`

**Interfaces:**
- Consumes: The real authorization test boundaries `database` and `storage`.
- Produces: A boundary counter and matrix union containing only exercised boundary types.

- [x] Remove `vi.mock("bcryptjs")`, the hash counter, and all assertions/types that include hash as a boundary; leave database and storage assertions intact.
- [x] Remove `bcryptjs` from production dependencies with `bun remove bcryptjs` and verify no production or test source reference remains.
- [x] Delete README entries for bcryptjs and Drizzle-Zod; run `bun run test:unit:run tests/capability-procedure-matrix.test.ts tests/architecture-complexity.test.ts`.

### Task 6: Run complete verification

**Files:**
- Inspect: OpenSpec change artifacts and the final Git diff.

**Interfaces:**
- Consumes: All implementation tasks above.
- Produces: A clean verified branch with no changes to runtime contracts.

- [x] Run `openspec validate --all --strict`.
- [x] Run `bun run check-types`, `bun run lint`, and `bun run test:unit:run`.
- [x] Run `bun run build`; if Turbopack is blocked by host restrictions, use the documented `bun next build --webpack` mode and record the limitation.
- [x] Run `git diff --check`, inspect `git status --short`, and update OpenSpec task checkboxes only after each check succeeds.
