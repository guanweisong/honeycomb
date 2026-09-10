# Dependency Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade every dependency classified as worthwhile while keeping the deferred toolchain migrations unchanged and restoring a clean dependency audit.

**Architecture:** Apply upgrades in three independently verifiable batches: security and low-risk releases, framework-facing major releases, then authentication. Use compiler and focused tests as migration feedback, preserve exact pins for coordinated framework packages, and document only genuine residual audit exceptions.

**Tech Stack:** Bun 1.4.2, Next.js 16.3.4, React 19.3, TypeScript 6, Vitest 4, Playwright 1.63, Better Auth 1.7.

**Spec:** `package.json` plus the dependency-review decision recorded in the current task.

## Global Constraints

- Keep `@tanstack/react-table` on v8, Vitest on v4, ESLint on v9, and TypeScript on v6.
- Upgrade `better-auth`, `@better-auth/drizzle-adapter`, and `@better-auth/passkey` together.
- Keep React, React DOM, and their type packages on matching 19.3 releases.
- Finish with type checking, linting, unit tests, production build, and dependency audit.
- Do not overwrite unrelated worktree changes.

---

### Task 1: Capture the dependency baseline

**Files:**
- Modify: `docs/superpowers/plans/2026-09-10-dependency-upgrades.md`

**Interfaces:**
- Consumes: current `package.json`, `bun.lock`, and audit policy.
- Produces: an explicit upgrade boundary and verification baseline.

- [ ] **Step 1: Run the current type checker and focused component/authentication tests.**
- [ ] **Step 2: Record any pre-existing failure before changing dependencies.**
- [ ] **Step 3: Confirm the deferred dependencies remain outside the update set.**

### Task 2: Upgrade security and low-risk dependencies

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify if needed: `scripts/dependency-audit-exceptions.json`
- Test: `tests/quality-workflow.test.ts`

**Interfaces:**
- Consumes: current Bun override structure and audit script.
- Produces: patched AWS, icons, i18n, email API, validation, browser testing, CLI, and secure transitive versions.

- [ ] **Step 1: Upgrade the low-risk direct dependencies.**
- [ ] **Step 2: Refresh transitive resolutions and add narrowly scoped overrides only where parent packages cannot resolve patched versions.**
- [ ] **Step 3: Run the production dependency audit and quality-workflow test.**
- [ ] **Step 4: Verify deferred direct dependencies did not move.**

### Task 3: Migrate framework-facing major dependencies

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `src/packages/ui/components/calendar.tsx`
- Modify: `src/packages/ui/extended/DynamicForm/FieldControl.tsx`
- Modify if required: `src/app/admin/(root)/(dashboard)/dashboard/components/CustomPie/index.tsx`
- Modify if required: `src/app/(blog)/components/RichText/index.tsx`
- Modify if required: `src/packages/infrastructure/content/parser/get-all-image-link-form-html.ts`
- Test: existing tests colocated with those features.

**Interfaces:**
- Consumes: existing Calendar, chart, rich-text, parser, animation, and email-template APIs.
- Produces: the same application behavior on DayPicker 10, Recharts 3, parser majors, Motion 13, React Email Components 1, and React 19.3.

- [ ] **Step 1: Upgrade React and matching types, Motion, Recharts, React Email Components, and the HTML parsers.**
- [ ] **Step 2: Replace `react-day-picker` with `@daypicker/react` and migrate removed class-name keys.**
- [ ] **Step 3: Run the type checker to expose incompatible APIs.**
- [ ] **Step 4: Make the minimum source changes required by the official migration guides.**
- [ ] **Step 5: Run focused tests and type checking until green.**

### Task 4: Upgrade Better Auth as a coordinated unit

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify if required: `src/auth.ts`
- Modify if required: `src/auth-client.ts`
- Modify if required: `src/packages/identity/auth/server/auth-hooks.ts`
- Test: `src/packages/identity/auth/credentials.test.ts`
- Test: authentication-related unit and E2E tests.

**Interfaces:**
- Consumes: the existing Drizzle schema, email/password login, social providers, username, captcha, and passkeys.
- Produces: equivalent authentication behavior on Better Auth 1.7.4 without applying an unreviewed database migration.

- [ ] **Step 1: Upgrade all three Better Auth packages to 1.7.4 together.**
- [ ] **Step 2: Run type checking and authentication unit tests.**
- [ ] **Step 3: Inspect schema differences without applying them; record any required production migration.**
- [ ] **Step 4: Fix only migration-guide incompatibilities used by this project.**

### Task 5: Full verification

**Files:**
- Modify if necessary: source or test files implicated by verified regressions.

**Interfaces:**
- Consumes: all upgraded dependency batches.
- Produces: a buildable, tested, auditable repository with deferred versions unchanged.

- [ ] **Step 1: Run `bun run check-types`.**
- [ ] **Step 2: Run `bun run lint`.**
- [ ] **Step 3: Run `bun run test:unit:run`.**
- [ ] **Step 4: Run the production build.**
- [ ] **Step 5: Run `bun audit` and the repository audit policy.**
- [ ] **Step 6: Run `git diff --check` and review the final diff.**
