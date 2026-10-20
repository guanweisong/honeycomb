# Simple Feature Architecture Implementation Plan

> 历史检查点（冻结于 2026-10-20）：下文保留当时计划、目录、验证限制和授权顺序，不再作为当前实施清单。后续 [PR #13](https://github.com/guanweisong/honeycomb/pull/13) 已合并至 `bc07eb302e86d7a5c2bf8856f7a5cb32c5b1dea9`；[合并后 CI 39367870674](https://github.com/guanweisong/honeycomb/actions/runs/39367870674) 通过（1,984 单元、48 进程、64 E2E）。这些后续证据覆盖下文旧的“仅本地 / 待浏览器验证”状态，但不是新一轮验证结果，也不表示自动归档。当前架构见[架构与依赖边界](../../architecture-dependency-report.md)，本轮目录归属工作以 [refine-directory-ownership OpenSpec](../../../openspec/changes/refine-directory-ownership/proposal.md) 为准。

> For agentic workers: execute the approved migration in coherent checkpoints, preserve behavior, and independently review the completed branch.

**Goal:** Replace unpublished package layering with app composition, business features, generic components, and shared technical libraries.

**Architecture:** Routes, layouts, HTTP handlers and root tRPC composition belong in app. Business routers, schemas, pure rules, server operations and UI belong in their owning feature. Components contain reusable UI/editor primitives; lib contains database, auth, tRPC configuration, cache, storage, observability and localization.

**Tech Stack:** Existing Next.js, TypeScript, tRPC, Drizzle, Vitest and Playwright versions, unchanged.

**Spec:** The user-approved architecture recorded in this plan and the corresponding OpenSpec change.

## Global Constraints

No product, URL, persistence schema, public interface, dependency or security configuration changes. Preserve authorization, GUEST/public visibility, input and persisted-value validation, transactions, concurrent-write guards, publication constraints, degraded publicSync behavior, media side effects, draft recovery, and Sentry privacy/public DSN fallback. No push, PR, merge, deployment or production writes.

## Review Focus

- Concurrent category parent changes must retain SQL cycle guards, not only preflight checks.
- Published post/page transitions must retain existing constraints and failure codes.
- Cache invalidation failures must retain successful writes and degraded feedback.
- Browser bundles must not import database/auth server/native SDK implementations.
- Draft recovery and shared editor media selection must retain existing behavior.

## Task 1: Relocate ownership and composition

- [x] Verify master and baseline unit tests; record source counts.
- [x] Move technical packages to lib, shared UI/editor to components, business types and options to owning features.
- [x] Move category admin and editor media controls to their correct business owners.
- [x] Flatten artificial feature layers into schema/types/rules/server responsibilities.
- [x] Move root tRPC composition/server caller to app/_trpc; retain lib/trpc common context/client/middleware.
- [x] Update all imports, configs, tests and runtime paths; preserve real public client/server boundaries.

## Task 2: Simplify business call chains

- [x] Remove central contracts forwarding and trivial query/action wrappers.
- [x] Collapse page use-case/handler/aggregate chain into directly tested functions.
- [x] Simplify other feature forwarding and unnecessary repository abstractions, retaining substantive rules and adapters.
- [x] Run affected feature/router/security regressions and checkpoint local commits.

## Task 3: Enforce and document the new design

- [x] Update architecture lint/tests, docs, repository skills and OpenSpec without weakening security or coverage gates.
- [x] Add regression assertions for new boundaries and eliminated indirection.
- [x] Record exact before/after directory/file counts and representative call chains.

## Task 4: Validate and review

- [x] Run full unit, process, coverage, types, lint, build and feasible development/production E2E using only disposable local test databases.
- [x] Obtain independent whole-branch review; fix important issues and rerun affected validation.
- [x] Produce local commits and a recovery bundle; report verified outcomes and precise limitations.

## Decisions

The latest user-approved simple architecture supersedes existing DDD directory rules; substantive data, security and testing rules remain binding. Schema/type-only dependencies from shared database/auth libraries to feature-owned pure catalogs are allowed; runtime feature orchestration remains app-side and is forbidden in shared tRPC configuration.

## Final evidence

See [migration results](../../simple-feature-architecture-results.md) for exact counts, passing checks and the explicit local browser E2E limitation. Local checkpoints and a complete recovery bundle were created; no remote action was taken.
