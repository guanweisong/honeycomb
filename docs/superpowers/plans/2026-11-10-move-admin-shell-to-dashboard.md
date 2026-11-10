# Admin Shell Ownership Move Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the protected admin shell and its menu configuration into the `(dashboard)` route group, then make the repository conventions match those owners.

**Architecture:** Keep the existing component tree and tests intact while relocating `AdminLayout` and `AdminNavigation` under dashboard `components`. Move the shell-only menu data to dashboard `config`, then update all imports and current ownership references; preserve earlier change artifacts as history with a superseded note.

**Tech Stack:** Next.js App Router, React, TypeScript, OpenSpec.

**Spec:** `openspec/changes/move-admin-shell-to-dashboard/specs/package-layer-architecture/spec.md`

## Global Constraints

- App Router route groups organize files and do not appear in URLs.
- Keep the dashboard authentication layout, authorization, Provider order, route URLs, exports, `use client` boundaries, shell interactions, and existing test scenarios unchanged.
- The admin root layout and login/forbidden UI remain owned by their existing routes.
- Do not keep compatibility barrels or old component paths.
- Do not run tests; use static import, diff, type, lint, and OpenSpec checks only.

## Review Focus

- No production imports, test imports, or mocks retain the old component/config paths.
- `AdminNavigationItem` remains the single navigation-item type source after moving `menu-data`.
- All moved modules retain their original client directives and named exports.
- The root admin layout, dashboard layout/template, route URLs, and Provider/auth composition remain unchanged.
- The current architecture index points to the new requirement and the old path decision is clearly marked historical.

---

### Task 1: Move the dashboard shell and menu configuration

**Files:**
- Move: `src/app/admin/components/AdminLayout/**` → `src/app/admin/(dashboard)/components/AdminLayout/**`
- Move: `src/app/admin/components/AdminNavigation/**` → `src/app/admin/(dashboard)/components/AdminNavigation/**`
- Move: `src/app/admin/constants/menu-data.tsx` and its test → `src/app/admin/(dashboard)/config/`
- Modify: all source and test import paths referencing these modules

- [x] Move the component trees and existing tests without changing their implementation or assertions.
- [x] Update the `AdminClientShell`, editor, menu config, test imports, and mocks to the new locations.
- [x] Confirm `src/app/admin/components` and the old menu-data path are removed.

### Task 2: Update ownership conventions and historical pointers

**Files:**
- Modify: `.codex/skills/frontend-structure/references/architecture.md`
- Modify: `.codex/skills/frontend-structure/references/directory-templates.md`
- Modify: `docs/code-reading-map.md`
- Modify: `openspec/changes/refine-owned-module-locations/design.md`
- Modify: `openspec/changes/refine-owned-module-locations/specs/owned-module-locations/spec.md`
- Add: `openspec/changes/move-admin-shell-to-dashboard/**`

- [x] Make the new dashboard ownership requirement the current indexed rule.
- [x] Mark the previous header-context path requirement as superseded while preserving historical decisions and evidence.
- [x] Update directory guidance and code-reading references.

### Task 3: Static review

**Files:**
- Review all changed source, tests, OpenSpec artifacts, and documentation.

- [x] Confirm no stale old path references remain outside explicitly historical migration records.
- [x] Run OpenSpec validation, type checking, lint, and `git diff --check`; do not run tests.
