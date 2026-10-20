# Simple feature architecture migration

> 历史检查点（冻结于 2026-10-20）：下文保留当时计划、目录、验证限制和授权顺序，不再作为当前实施清单。后续 [PR #13](https://github.com/guanweisong/honeycomb/pull/13) 已合并至 `bc07eb302e86d7a5c2bf8856f7a5cb32c5b1dea9`；[合并后 CI 39367870674](https://github.com/guanweisong/honeycomb/actions/runs/39367870674) 通过（1,984 单元、48 进程、64 E2E）。这些后续证据覆盖下文旧的“仅本地 / 待浏览器验证”状态，但不是新一轮验证结果，也不表示自动归档。当前架构见[架构与依赖边界](architecture-dependency-report.md)，本轮目录归属工作以 [refine-directory-ownership OpenSpec](../openspec/changes/refine-directory-ownership/proposal.md) 为准。

Baseline: `89922f9b59ed298006c9409bc07f1d295a973828` (verified master tree). This is a structural refactor, not a product, URL, database-schema, dependency or security-configuration change.

## Ownership

- `app`: routes, layouts, HTTP/framework composition, private root tRPC router/server caller, auth hooks.
- `features`: business routers, schemas, rules, persistence operations and business UI, including category administration, shared media selection and public content components.
- `components`: reusable UI, editor primitives, generic admin layout contexts and PhotoSwipe.
- `lib`: shared database, auth primitives, tRPC client/context/middleware, cache, storage, observability, validation and localization.

No `src/packages`, central feature-contract forwarding or mandatory application/domain/infrastructure directories remain. Larger post/page/media modules retain responsibility-based files rather than becoming giant server files. Media storage/persistence seams remain where they carry meaningful behavior.

## Reproducible source metrics

Count all files under `src`; count directories below `src`, excluding `src` itself; depth is relative to `src`. Baseline uses `git ls-tree -r 89922f9b src`, final uses the source tree.

| Metric                                        | Before | After |
| --------------------------------------------- | -----: | ----: |
| Source files                                  |    787 |   746 |
| Source subdirectories                         |    302 |   254 |
| Maximum directory depth                       |      8 |     6 |
| Files in artificial packages hierarchy        |    294 |     0 |
| Package directories                           |     69 |     0 |
| application/domain/infrastructure directories |     27 |     0 |

File totals include tests, so the count reduction is not a measure of removed test coverage.

## Representative call chains

Before page status update: router → use-case wrapper → command handler → PageAggregate → command repository → database, followed by invalidation.

After: feature router (same input/authorization entry) → `updatePage(db, input, invalidator)` in feature/server.ts → pure status rule + persisted-status validation + transaction → invalidation with unchanged publicSync result.

Before category update: router → application forwarding → repository adapter. After: category/router.ts → category/server.ts direct operation. Both preflight cycle validation and the atomic recursive SQL parent guard remain. A new regression simulates a stale preflight race and verifies rollback and no invalidation.

Post/page editor media picker/provider now share their media feature owner; neither editor imports business UI from the other. Generic Tiptap remains in components/editor. Page editor query input is passed directly as `{ id }`, without a one-line forwarding function.

## Validation record

- Full unit coverage for architecture checkpoint `1a7c0788` (before the documentation/comment follow-up below): 341 files / 1,964 tests passed. The final list-schema consolidation also separately passed 74 focused tests and TypeScript.
- Coverage: statements 90.32%, branches 84.17%, functions 87.78%, lines 91.36%; existing thresholds unchanged.
- Process gates: 48 passed. Baseline 52 included 12 duplicate router checks. Removing those and the deleted default-context wrapper, adding 7 direct server modules and 2 app auth modules, gives 48. Unique protected server modules increased from 28 to 36; all four behavioral/runtime checks and eight coverage checks remain.
- Full TypeScript and ESLint passed; migration governance passed for all 4 migration files.
- Strict OpenSpec: 44 passed. Architecture/static tests, browser dependency graph and Edge/native boundaries passed. The whole-client graph test has a 15-second instrumentation budget, with no exclusions or assertion changes.
- Independent review found no actionable correctness/security regression, including public UI ownership changes.
- Production build passed, including TypeScript and prerender generation. A request-only production smoke test for blog/login/manifest and security headers also passed after matching the build to the E2E test-only asset/R2 configuration. Development E2E started successfully against its isolated local server: 2 request-only tests passed; 61 browser-dependent tests could not launch Chromium because the default execution sandbox blocks Unix-domain sockets. Production browser E2E was not run. All local database-backed build/E2E/HTTP smoke attempts verified cleanup of their unique temporary databases and owned processes. Only explicit test-only values and empty Sentry DSNs were used; no production database or Sentry ingest was used.

Initial validation failures were stale path/static quote assumptions and a coverage-instrumented graph timeout; corrected without reducing protected behaviors. Official Playwright Chromium download failed with a corrupt archive; system Chromium is available, but the default command sandbox blocks its Unix-domain socket creation. The standard escalated retry failed before execution because its runtime mount could not be created (read-only filesystem). Browser E2E therefore remains unverified locally and needs a supported CI runner; product security settings were not changed.

The successful production HTTP smoke logged a Next.js prerender warning about `crypto.randomUUID()` on `/admin/login`. A bounded baseline comparison then built detached master `89922f9b59ed298006c9409bc07f1d295a973828` with identical installed dependencies, matching test-only asset/R2 configuration and the same isolated request-only production smoke. Baseline build and smoke both passed and reproduced the identical route/value warning. This establishes that the warning predates the refactor in this setup; it does not establish that the warning is harmless in all deployments. No product fix was included. Both baseline temporary database runs verified cleanup.

All changes remain local. No push, PR, merge or deployment has been performed.

## Documentation and comment follow-up

A bounded independent audit covered 70 current documentation/spec/skill files and 25 script/config/workflow files. It identified five factual or misleading documentation groups, all corrected: the README incorrectly described Sentry as future work; the account-security spec still required a domain package; performance/authorization specs used obsolete layer names; the test README misstated tests-directory ownership and mandatory helper naming; and a historical equivalence claim used an ambiguous current-looking HEAD. Nine dated pre-refactor plans/designs now explicitly link current guidance without rewriting their historical contents. No unexplained broken source paths or relative links were found within this audited set; this is not a claim that every archived document is drift-free.

Existing comments already explain category atomic cycle guards, persisted-user authorization, draft compare-before-clear behavior and Sentry privacy allowlists. Eight production files received comment-only corrections/additions describing current ownership, publication transitions versus normal edits, atomic translation writes, public visibility intersections/rechecks, post-commit cache degradation and indeterminate media outcomes. No comment purports to add a lock or stronger concurrency guarantee than the implementation provides. Legacy error text mentioning aggregates is intentionally unchanged to preserve behavior.

Verification: TypeScript AST printing with comments removed confirmed all eight production files are behavior-identical. Eight focused suites passed 144 tests, including two new documentation consistency regressions; strict OpenSpec passed all 44 items. Full coverage was not rerun for this documentation/comment-only follow-up; the checkpoint coverage above is not presented as the new test total.

## Redundant-file follow-up

A whole-tree TypeScript import graph, framework-entry review and independent deletion review found 18 removable tracked files: seven duplicate admin page forwarding/wrapper files, six export/type/cache-decoder forwarding files, a redundant authentication policy plus its superseded test, and three obsolete root declaration/Tailwind configuration files. Route entrypoints remain in `app`; tests now exercise the underlying user policy and auth hooks directly. The media wrapper's optional callback remains unset in route usage.

The audit also repaired shadcn aliases to resolvable `@/components` / `@/lib` paths and removed explicit CSS sources pointing at nonexistent directories. A regression checks both existing targets and TypeScript resolution of generated import specifiers. Tailwind output before and after removing the inert legacy configuration and sources was byte-identical.

After cleanup, the 48 source files with no production importers are framework-selected `app` entries, instrumentation files and `proxy.ts`, not evidence of dead modules. Database migration history, historical design records and behavior-bearing tests remain. The audit does not treat missing static imports alone as permission to remove dynamic/framework entrypoints.

Verification after redundant-file cleanup: 341 unit suites / 1,971 tests passed with coverage (statements 90.42%, branches 84.20%, functions 88.07%, lines 91.47%), all 48 process tests passed, and TypeScript, ESLint, production build and diff whitespace checks passed. The first verification attempt lacked Bun on PATH; a subsequent overlapping coverage run hit two fixed-timeout lint tests. Rerunning with the existing Bun 1.4.2 binary on PATH and the unchanged CI two-worker setting passed in full, without weakening timeouts, assertions or coverage thresholds. The production build used an isolated temporary file database, with cleanup verified. Browser E2E retains the previously documented environment blocker; it was not claimed as passed.

## Project SKILL alignment follow-up

Reviewed all ten repository skills plus the frontend reference documents against the refactor and cleanup. Retained the existing simple-feature architecture, authorization, runtime isolation, unique-contract and database-safety requirements. Corrected the `english-commit` discovery name and clarified public-site UI ownership, framework-required route entrypoints, and the pre-existing locked coverage exceptions. No new exclusions or weaker thresholds were introduced. OpenSpec-generated `compatibility` metadata remains intact; the generic local skill validator does not recognize that field, so its failure is not treated as evidence that those generated skills need rewriting.

Fixed implementation rather than relaxing valid rules: auth hook tests now use complete Better Auth Session/User fixtures, legal nullable context and explicit hook-presence checks instead of `as never`; feature/contract governance discovers actual modules without fixed names, mandatory boilerplate or inventory counts. Root composition is checked against actual mounted routers, including imported-but-unmounted and uninspectable counterexamples. A new shared test-only inventory helper serves both boundary suites. Skill metadata/local-reference regressions validate discoverable names and linked Markdown resources; restoring the old invalid commit-skill name was verified to fail the test, then the correct name was restored.

Final verification: 341 unit suites / 1,975 tests passed with unchanged coverage thresholds (90.42% statements, 84.20% branches, 88.07% functions, 91.47% lines), 48 process tests, TypeScript, ESLint, all 44 strict OpenSpec items and whitespace checks passed. This follow-up changes tests, skills and documentation only; it does not claim a new production build or browser run. The preceding cleanup build remains the latest build evidence. Browser E2E is now an explicit pending task 4.5, so the change is not ready for archive. No push, PR, merge or deployment was performed.

## Push authorization update — 2026-10-20

The user subsequently authorized committing and pushing the completed work to `origin/refactor/simple-feature-architecture`. This supersedes the earlier local-only checkpoint for this branch only. Browser E2E remains pending under task 4.5; no PR, merge, deployment or archive is authorized by this update. Remote push verification is reported separately after the operation, rather than claimed in advance here.

## Publication and full-diff review — 2026-10-20

After separate user approval of the connected GitHub route and regenerated commit history, branch `refactor/simple-feature-architecture` was published at `4b579b3c1c70488fe79ce80fbe5d5a2232d3b7d3`. Remote tree `6ba81e81525c9ae3ae085d16c600bd0977c5f3bb` was verified equal to local commit `ec719167e535c70bf75857857889d27b38d72a81`. Local history was not rewritten. No PR, merge or deployment was performed. The review follow-up described below is local and is not included in that published commit.

Fresh baseline-to-HEAD review covered content servers/routers, authorization, DTOs, transactions and cache side effects, authentication/comments/media, and route/provider/editor/configuration changes. No introduced production behavior or security defect was confirmed. This is a bounded code review, not proof of full equivalence or a substitute for browser validation.

One introduced test blind spot was confirmed: the client-entry dependency gate recognized `use client` only with a beginning-of-file regex, missing a valid directive preceded by a comment. No current production file was found leaking server code through that gap. The fix uses the parsed directive prologue and preserves recursive runtime checks.

Separately, the baseline homepage infinite-scroll E2E swallows loader timeouts and accepts unchanged item counts (`tests/e2e/blog/home.spec.ts`); it does not prove that a next page loads. This is pre-existing and was not silently rewritten or claimed as validated. Before final E2E acceptance, deterministic next-page data and strict request/item-growth assertions should be added and run in a supported browser environment. Task 4.5 remains pending.

The client-directive fix was verified RED/GREEN: the previous regex failed four of nine new directive cases; the AST implementation passes all nine. The complete follow-up run passed 341 suites / 1,984 unit tests with unchanged coverage, all 48 process tests, TypeScript, ESLint and all 44 strict OpenSpec items. No production code was changed in that review. The user subsequently authorized strengthening the infinite-scroll E2E, updating the branch, opening a PR and merging to master only after successful quality/E2E checks. Those remote acceptance results are not claimed by this local review checkpoint.

The homepage E2E now requires the real `post.index` page-two request, a successful response and growth from ten to twelve distinct visible post identities with the expected appended fixtures. The existing guarded seed adds ten older translated articles without changing the original first-post/search fixtures. TypeScript, targeted ESLint, Playwright inventory and 35 relevant unit tests passed; this is preparation for CI, not a claim that the browser test has run locally.
