# Task 2 completion report

## Result

- `BAN` public comments retain their parent/tree placement but expose `content: ""`.
- The admin update command now has one dedicated, strict runtime schema. It permits only `author`, `content`, `email`, `site`, and `status`, requires one of those fields, and is the sole source for the Application `CommentUpdate` contract.
- The tRPC transport assembles request metadata with the shared `getClientIp` normalizer, preserving the first forwarded address rather than storing a raw header chain.
- Comment email sends are still best-effort, but notification orchestration awaits every attempted send; individual failures are logged using operation and error type only.

## Review fix round 1

- Every email send is wrapped with a rejection handler at launch. A failed send is logged immediately with only the operation and error type, so it cannot become an unhandled rejection while comment preparation is still pending.
- If parent-comment preparation fails after the administrator send starts, orchestration first awaits the started send and then rethrows the preparation error. The Application caller records that preparation failure through the existing sanitized logger.
- The commit no longer depends on the dirty cache-coherence invalidator or relocated `CleanZod` helper: comment contracts use direct `z.infer`, and comment commands use the parent commit's `invalidateContent`/`invalidateAll` API.
- Legacy persistence callers remain supported by a normalized-Headers adapter and an infrastructure `toPublicComment` adapter, preserving the committed parent's tracked post persistence contract.

## TDD evidence

RED was observed before implementation:

- `comment-public-dto.test.ts`: a `BAN` source returned `"Hello"` rather than `""`.
- `comment.update.schema.test.ts`: id-only and `postId` update inputs parsed successfully.
- `comment-delivery.test.ts`: notification resolved while both controllable send promises were pending.
- `comment.router.test.ts`: `"203.0.113.10, 10.0.0.1"` was persisted without normalization.

GREEN verification:

- `bunx vitest run src/features/comment` — 19 files, 69 tests passed.
- `bunx vitest run src/packages/trpc/api/capability-procedure-matrix.test.ts` — 83 tests passed.
- `bun run check-types` — passed.
- `bun run lint` — passed.
- `bun run test:unit:run` — 279 files, 1,274 tests passed.
- `git diff --check` — passed.
- `bun next build --webpack` — passed; the build reported existing Serwist/Browserslist critical-dependency warnings.

Round-1 verification:

- `bunx vitest run src/features/comment/notifications/comment-delivery.test.ts` — RED observed for parent-lookup early settlement and delayed admin-rejection handling, then GREEN with all 4 tests passing.
- Working tree: `bun run check-types` and `bunx vitest run src/features/comment` — 19 files, 71 tests passed.
- Working tree final sweep: `bun run lint`, `git diff --check`, and `bun run test:unit:run` — 279 files, 1,276 tests passed; `bun next build --webpack` passed with the existing Serwist/Browserslist critical-dependency warnings.
- Isolated amended commit: detached worktree at `/private/tmp/honeycomb-task2-isolated-189fd6c` on `780399443b4e6af08a0d79756da35942fce68296`; `bun run check-types` and `bunx vitest run src/features/comment` both passed (71 tests). The worktree used a temporary `node_modules` symlink only; no source files from the dirty checkout were present.

`bun run build` (Turbopack) was attempted twice, including once outside the sandbox, but fails before application compilation because Turbopack cannot bind a local worker port (`Operation not permitted`). The webpack build completed successfully.

## Included pre-existing in-scope work

This dirty checkout already contained the comment Application/infrastructure boundary move. The commit retains and includes its necessary related hunks rather than reverting them:

- Request-metadata repository signature and command-repository persistence adapter.
- Router dependency assembly and Application-side target/parent policy delegation.
- Public DTO/query ownership move from infrastructure into Application, including the deleted legacy façade modules.
- Public invalidator API migration in the comment command/router tests.

The unrelated cross-feature dirty files remain unstaged and untouched. The capability-procedure matrix fixture was updated from invalid id-only `comment.update` input to a valid status moderation input so that its authorization-to-database-boundary test remains meaningful under the new contract.

The dirty cache-coherence migration currently exposes only plan-based invalidation. Local compatibility adapters in `src/packages/infrastructure/refresh-path.ts` keep this working tree type-correct while Task 2 retains the parent-compatible invalidator contract; those shared adapters are deliberately unstaged and are not required by the isolated Task 2 commit.
