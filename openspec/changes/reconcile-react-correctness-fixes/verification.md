# Verification record

## Baseline and scope

- Adapted to current `origin/master` at `ebefd590204a5dfbadecdbbf2b46bcd68d7a7b7e`, re-fetched on 2026-10-21 with no additional drift.
- Earlier work remains separately preserved at `33432b9405ef3708ae32f0f3c05e4b8c333f4698`. Its test/build results are not validation of this adaptation.
- Retained current feature/server architecture, versioned editing, publication checks, media behavior, unrestricted batch-delete contract, blog menus and hover controls. No migrations or data backfill.
- All four implementation slices received independent source review. No actionable findings remained. `git diff --check` passed.

## Targeted regression checks

Exact runtimes: Node 22.14.0 and Bun 1.4.2. Vitest commands used one worker and the repository's normal test timeouts, with synthetic configuration and disposable local databases only.

- Forms/editor/calendar: 19 files, 127 tests passed after a RED run with 27 expected failures.
- Data/auth: 21 files, 178 tests passed after a RED run with 23 expected failures. Includes actual login handler, translation rollback, full admin/detail preservation and all public post types/QUOTE fields.
- Navigation/menu: original run passed 75 of 76 tests. The remaining test failed because its Probe did not subscribe to tracked query properties. The test-only correction passed in the final targeted run; production code was unchanged.
- Security/tooling: 13 files, 135 tests passed. Valid RED evidence included 18 security failures and 5 E2E preflight failures. The latter rerun corrected an earlier invalid parameterized test fixture.
- Final targeted run: `vitest run --maxWorkers=1 tests/integration/dynamic-form-sessions.test.tsx tests/integration/reconciled-data-boundaries.test.ts src/features/post/public/use-post-list.test.ts`: 3 files, 33 tests passed (44.64 seconds). This rechecked both test relocations and the query-tracking correction.
- These slices overlap. Their counts must not be added together as a unique full-suite total.

## Environment limitations

The current frozen dependency installation failed on registry DNS resolution, including newly added `@sentry/nextjs` 11.8.0. Targeted tests used the available copied dependency tree, not a verified current frozen installation. No dependency manifests/lockfile were changed to bypass that problem and no fake Sentry modules were introduced.

The current full coverage suite, production build/analyzer, production advisory check, and real browser E2E have not been validated locally for this adaptation. Browser inventory/configuration tests do not substitute for browser execution. GitHub CI must validate the exact published commit with the unchanged current workflow and a fresh frozen install.

A one-time `HUSKY=0` publication commit was approved to avoid repeating locally blocked gates. Hooks and CI gates remain unchanged. No production database, real email, external storage or deployment was used.

## Final static pass

- `bun run check-types`: route generation passed; TypeScript exited 2. It reported missing current Sentry packages and their downstream inferred types, plus two new test-only fixture/generic errors. The latter were corrected with an explicit DynamicForm Zod-shape generic and `satisfies MenuEntityTree`; both changes received independent review. The final two typing edits have not been re-run locally and remain subject to exact-commit CI.
- No production-source type errors outside the unchanged Sentry dependency chain were reported. This is not a successful typecheck.
- `bun run lint`: exited 1 with 52 errors confined to unchanged Sentry integration files whose dependency was unavailable; three pre-existing unused-variable warnings in unchanged media tests. No lint errors were reported in changed files.
- `bun run quality:spec`: passed all 64 items and the diff policy check.
- `bun run db:migrations:check`: passed all nine migration files; no migrations changed.
