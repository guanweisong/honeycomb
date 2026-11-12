# Local PR Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one local command for the repository's non-browser PR checks, with isolated SQLite setup and automatic cleanup.

**Architecture:** Add a Bash runner exposed through `package.json`; it reuses `scripts/ci-fixture-lifecycle.sh` and existing check commands. Production E2E and production builds remain in GitHub Actions, which is the final PR gate.

**Tech Stack:** Bun, Bash, Vitest, OpenSpec, local SQLite.

**Spec:** `docs/superpowers/specs/2026-11-12-local-pr-verification-design.md`

## Global Constraints

- The local fixture MUST be an exclusive temporary SQLite database, created and cleaned by `scripts/ci-fixture-lifecycle.sh`.
- Repository `.env*` files and developer databases MUST NOT be moved, overwritten, or used as test databases.
- The local command MUST NOT run production browser E2E or production builds; PR CI remains responsible for those lanes.
- Existing package commands and conditional GitHub CI lanes MUST remain independently usable and unchanged in scope.

## Review Focus

- A shell-provided production `TURSO_URL` MUST be replaced with the local fixture URL before migration, seed, and tests; verify by running the aggregate command and confirming its fixture reports a `file:` URL under its temporary directory.
- A command failure MUST keep a nonzero result and still clean the owned fixture; reuse the lifecycle helper's existing failure-propagation test and confirm cleanup output on the aggregate run.
- A repository `.env*` file MUST remain untouched; keep the aggregate command out of E2E preflight and run checks with the existing dotenv files present.
- OpenSpec diff validation MUST execute from the Git repository root; verify the aggregate command runs `quality:spec` successfully on the current branch.
- Production browser verification MUST remain in the applicable PR CI lane; verify the local runner has no browser command and the existing workflow contract tests still pass.

---

### Task 1: Add a single local PR verification command

**Files:**
- Create: `scripts/verify-pr.sh`
- Modify: `package.json`
- Modify: `scripts/ci-fixture-lifecycle.sh`
- Modify: `tests/tooling/quality-workflow.test.ts`
- Modify: `tests/README.md`

**Interfaces:**
- Produces: `bun --no-env-file run verify:pr`, mapped to `bash scripts/verify-pr.sh`.
- Reuses: `prepare_fixture()` and `phase()` from `scripts/ci-fixture-lifecycle.sh`.

- [ ] **Step 1: Add a failing entrypoint contract test**

In `tests/tooling/quality-workflow.test.ts`, add a test named `exposes the local PR verification command` that expects `packageJson.scripts["verify:pr"]` to equal `bash scripts/verify-pr.sh`.

- [ ] **Step 2: Run the contract test and confirm it fails**

Run: `bun --no-env-file run --bun vitest run tests/tooling/quality-workflow.test.ts`

Expected: the new assertion fails because `verify:pr` is not registered yet.

- [ ] **Step 3: Implement the runner and register it**

Create `scripts/verify-pr.sh` with `set -euo pipefail`; on macOS use `/private/tmp` for `TMPDIR` when available; set the safe build-only site/auth values and `E2E_SEED=1`; create `HONEYCOMB_TEST_DIR` with `mktemp`; source `scripts/ci-fixture-lifecycle.sh` immediately; call `prepare_fixture()`; then run four named phases in order: type generation plus `tsc --noEmit`, ESLint, strict OpenSpec validation plus `scripts/check-diff.ts`, and the full Vitest suite. Invoke Bun directly with `--no-env-file` for every phase so nested package scripts cannot reload `.env`. Use the helper's `phase()` so failures stop the runner and its existing EXIT/signal trap cleans the fixture. Update Bun calls in the lifecycle helper to pass `--no-env-file` where supported.

Register `"verify:pr": "bash scripts/verify-pr.sh"` in `package.json`. Update the existing workflow-contract expectations accordingly. Add a `Local PR verification` section to `tests/README.md` with `bun --no-env-file run verify:pr`, its scope, its isolated database behavior, and the CI-owned production checks.

- [ ] **Step 4: Run the contract test and confirm it passes**

Run: `bun --no-env-file run --bun vitest run tests/tooling/quality-workflow.test.ts`

Expected: the workflow contract suite passes.

- [ ] **Step 5: Run the new command end to end**

Run: `bun --no-env-file run verify:pr`

Expected: all four phases pass, the output reports fixture cleanup with `final exit=0`, and the temporary fixture directory no longer exists.

- [ ] **Step 6: Commit the finished change**

```bash
git add package.json scripts/verify-pr.sh scripts/ci-fixture-lifecycle.sh tests/tooling/quality-workflow.test.ts tests/README.md docs/superpowers/specs/2026-11-12-local-pr-verification-design.md docs/superpowers/plans/2026-11-12-local-pr-verification.md
git commit -m "chore(test): add local PR verification command"
```
