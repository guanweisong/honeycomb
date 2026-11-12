# Reliable Test Assertions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent false-positive asynchronous and clock assertions by recording shared rules and repairing the two known weak tests.

**Architecture:** Keep the repository-wide rule text in `AGENTS.md`. The frontend quality reference will link to that canonical text. Update only the two test files identified in PR review; production code and product specifications remain unchanged.

**Tech Stack:** Markdown, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-test-assertion-reliability-design.md`

## Global Constraints

- `AGENTS.md` is the canonical source for repository-wide test assertion reliability rules.
- The frontend quality reference links to canonical rules without duplicating their text.
- The pending assertion must observe both fulfillment and rejection of the page promise.
- The clock assertion must reject `Date.now()` and zero-argument `new Date()` while allowing timestamp-based formatting.
- No production behavior, test framework, OpenSpec product requirement, or test abstraction is introduced.

## Review Focus

- The page promise already fulfilled before the recommendation dependency check completes; the completion marker must expose this.
- The page promise rejects before the check; the settlement marker must expose either settlement path.
- The implementation reads `Date.now()`; the timestamp test must fail.
- The implementation calls `new Date()` without an argument; the timestamp test must fail.
- The implementation calls `new Date(timestamp)`; the timestamp test must continue to permit monotonic timestamp formatting.

---

### Task 1: Harden shared guidance and the reviewed assertions

**Files:**
- Create: `docs/superpowers/specs/2026-11-12-test-assertion-reliability-design.md`
- Create: `docs/superpowers/plans/2026-11-12-test-assertion-reliability.md`
- Modify: `AGENTS.md`
- Modify: `.codex/skills/frontend-structure/references/quality.md`
- Modify: `src/app/(blog)/[locale]/archives/[id]/page.test.ts`
- Modify: `src/lib/observability/adapters/console-metrics.test.ts`

**Interfaces:**
- Consumes: the reviewed promise lifecycle and current monotonic metric timestamp implementation.
- Produces: repository-wide rules for meaningful async and clock assertions, with frontend quality guidance linking to them.

- [x] **Step 1: Replace the race-based pending assertion**

In `waits for recommendations before rendering the article`, attach a settlement marker to `pending` immediately after creation. Set it on both fulfillment and rejection. After waiting for recommendation lookup to start, assert the marker is still unset. Remove the `Promise.race` against `Promise.resolve(false)`.

- [x] **Step 2: Guard the actual wall-clock entry points**

In `timestamps metrics without reading the wall clock`, make zero-argument `new Date()` fail during the metric call, and make `Date.now()` fail. Restore both globals/spies in `finally`; leave timestamp-argument construction available so the monotonic implementation can format an ISO timestamp.

- [x] **Step 3: Record the canonical repository-wide rules**

Add a concise `Test assertion reliability` section to `AGENTS.md`: async pending tests observe settlement from promise creation and check after a relevant dependency precondition; mocks must intercept the actual API named by the assertion; assertions must fail against the regression they claim to prevent.

- [x] **Step 4: Link frontend quality guidance**

Add a short link in `.codex/skills/frontend-structure/references/quality.md` to the canonical `AGENTS.md` rules. Do not repeat the rule text.

- [x] **Step 5: Review the resulting changes**

Run `git diff --check`, inspect the four-file diff for duplicated guidance and verify the assertions preserve monotonic timestamp formatting. Let PR CI execute the test suite; do not add or run another local test command.

- [ ] **Step 6: Commit and update the existing PR**

Commit the six-file change, including the approved design and completed plan, using the repository's English Conventional Commit convention. Push `codex/remove-recommendations-suspense`, then inspect the latest PR #47 checks and report their actual status.
