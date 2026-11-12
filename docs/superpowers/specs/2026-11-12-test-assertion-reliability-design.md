# Reliable Test Assertions — Design

## Intent

Prevent tests from passing without detecting the regression they claim to guard against. Two reviewed tests exposed recurring risks: asynchronous pending checks can race a settled fallback, and clock tests can mock a different API from the one the implementation calls.

## Goals

- Make the repository-wide test reliability rules easy to find and apply.
- Keep one canonical rule in `AGENTS.md`; make the frontend quality guidance point to it rather than repeat it.
- Repair the two current tests so they fail for the old, incorrect behavior.

## Non-goals

- Add an OpenSpec product requirement for test-writing techniques.
- Add a new test framework, helper library, or general mocking abstraction.
- Change production behavior.

## Approaches

1. **Rules only:** Document the general principles, leaving the two known weak assertions in place. This prevents some future cases but keeps misleading checks in the current PR.
2. **Rules plus focused fixes (recommended):** Put the canonical rules in `AGENTS.md`, link them from the frontend quality reference, and repair the two reviewed assertions. This makes the guidance discoverable and demonstrates it at the known failure sites without creating duplicate policy text.

## Chosen behavior

- Pending tests attach a completion marker to the promise as soon as it is created, wait until the relevant dependency has started, then assert the marker is still unset. They must not race the promise against an already-resolved fallback.
- Tests that prohibit a source such as wall-clock time intercept every API relevant to that claim, or inject a clock. Mocking `Date.now()` alone does not cover `new Date()`.
- Assertions must fail against the prior implementation or other behavior they are intended to reject.

## Files

- `AGENTS.md`: canonical repository-wide test assertion reliability rules.
- `.codex/skills/frontend-structure/references/quality.md`: short pointer to the canonical rules.
- `src/app/(blog)/[locale]/archives/[id]/page.test.ts` and `src/lib/observability/adapters/console-metrics.test.ts`: focused repairs for the reviewed findings.
