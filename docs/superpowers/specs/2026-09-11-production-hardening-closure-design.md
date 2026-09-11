# Production Hardening Closure Design

## Context

The current branch has strong module boundaries, runtime schemas, capability-based authorization, cache invalidation ports, and broad automated verification. A repository-wide audit nevertheless found security and correctness gaps that cross authentication, PWA caching, comment moderation, hierarchical data, media storage, and engineering governance.

This change closes those findings without replacing the existing lightweight DDD structure or changing the accepted rule that database writes complete before public-cache invalidation is attempted.

## Goals

- Prevent authenticated admin data from entering browser runtime caches.
- Restrict post-login navigation to safe same-origin admin paths.
- Enforce comment privacy and target invariants at the public contract boundary.
- Make hierarchical category reads and writes consistent at arbitrary depth.
- Bound public query and upload resource consumption.
- Correct confirmed list, media, localization, logout, and accessibility defects.
- Add executable governance so the same classes of defect cannot silently return.

## Non-goals

- Introducing an outbox, message broker, or distributed transaction system.
- Changing the documented database-write/cache-invalidation failure policy.
- Replacing tRPC, Better Auth, Drizzle, Serwist, or the current feature layout.
- Redesigning the visual language of the blog or administration UI.

## Approach

The work is delivered in five independently verifiable phases. Each behavior change starts with a failing regression test. Transport layers continue to parse input and assemble adapters; Application use cases own orchestration and business invariants; repositories own atomic persistence; infrastructure owns framework and external-service details.

### Phase 1: Authentication and browser-cache isolation

- Normalize login callback URLs on the server and client. Only absolute paths under `/admin` are accepted; protocol-relative URLs, encoded bypasses, external origins, and executable schemes fall back to `/admin/dashboard`.
- Replace Serwist's broad default runtime captures with explicit public-only rules. `/api`, `/admin`, RSC requests for admin routes, and responses carrying private/no-store semantics are network-only and never written to Cache Storage.
- On logout, clear user query state and application runtime caches, then use a hard navigation to `/admin/login`. Failed server logout remains visibly failed rather than pretending the session ended.
- Remove the global 300-second dynamic Router Cache override unless it can be scoped away from authenticated routes.

### Phase 2: Comment privacy and invariants

- Public comment DTO mapping redacts the author content of `BAN` comments before data leaves the server. The tree shape and moderation placeholder behavior remain intact.
- Define a dedicated admin comment-update schema rather than deriving it from public comment creation. It accepts only editable moderation fields and requires at least one changed field.
- Target reassignment is not part of ordinary moderation. Existing `postId`, `pageId`, `customId`, `parentId`, and captcha fields cannot reach the update repository.
- Public comment creation uses normalized request metadata and performs target validation and insert through one repository consistency boundary where practical.
- Best-effort notification delivery is awaited through settlement so the request lifetime contains the send attempt while delivery failures remain non-blocking.

### Phase 3: Data integrity and bounded contracts

- Add maximum limits to pagination, query strings, delete batches, and tag replacement batches. Public and admin callers share explicit constants.
- Enforce category path uniqueness in the database with a migration. Application checks remain for friendly errors; database constraint errors map to the same business outcome.
- Move category cycle-sensitive updates into a transactional repository operation or equivalent conditional persistence boundary.
- Separate hierarchical category-tree reads from paginated flat admin reads. Tree consumers receive a complete ordered tree; paginated consumers receive a conventional page.
- Resolve all descendants when filtering posts by an ancestor category.
- Require at least one mutation field in every update schema and de-duplicate tag IDs before persistence; add a database uniqueness constraint for post/tag/type associations.
- Make destructive menu clearing an explicit operation. Ordinary save rejects an empty payload.
- Protect user deletion with a conditional/transactional check that cannot delete an administrator after a stale pre-read.

### Phase 4: URLs, media, and functional correctness

- Reuse one HTTP(S)-only URL schema for comment sites, friendly-link destinations/logos, and site-record links. Public rendering also applies safe `rel` attributes.
- Correct description-only friendly-link search so each supplied filter has its documented meaning.
- Collect content images from every supported locale for Post and Page relations.
- Restrict media uploads to configured MIME types, extensions, per-file size, and batch size. Metadata creation validates the same policy.
- Replace all-or-nothing concurrent upload reporting with per-file settlement. Successfully uploaded files remain visible; failed metadata writes trigger best-effort object cleanup; retries do not conceal partial success.
- Preserve the existing idempotent object-first media deletion order, which is an explicitly accepted design trade-off.

### Phase 5: UI quality and governance

- Give media selection, comment reply, identity actions, and icon-only controls semantic buttons, accessible names, focus behavior, and keyboard support. Form fields receive persistent labels.
- Distinguish media loading, empty, and error states.
- Eliminate duplicate dashboard session/user reads while retaining server-side authorization at the protected layout.
- Correct the Serwist precache exclusion to match `.next/static/chunks/app/admin/**` and add a manifest assertion.
- Add CI commands for strict OpenSpec validation and `git diff --check`.
- Strengthen route-boundary tests so every admin page is either explicitly public or nested below the authenticated dashboard boundary.
- Extend single-source type governance to Category, Tag, and Comment command contracts.

## Error and consistency policy

- Authentication and authorization failures are fail-closed.
- Unsafe redirect input degrades to the dashboard and is never echoed into navigation APIs.
- Cache-control exclusions prefer fresh network failure over stale authenticated disclosure.
- Validation errors map to `BAD_REQUEST`; missing entities map to `NOT_FOUND`; uniqueness conflicts receive stable application errors.
- External email cleanup and object cleanup are best effort and observable, but do not reverse an already committed domain write.
- Existing database-first public-cache invalidation semantics remain unchanged and documented as an accepted retry ambiguity.

## Migration strategy

Before adding unique constraints, a migration audit detects duplicate category paths and duplicate post-tag-type rows. Post-tag duplicates are deterministically collapsed. Duplicate category paths cannot be renamed safely without product intent, so the migration check fails with an actionable report instead of silently changing public URLs.

## Verification

Each phase includes focused red-green tests. Final verification runs:

- TypeScript type checking and ESLint.
- Full unit and process-heavy Vitest suites with coverage governance.
- Migration governance and a migration against the test database.
- Production dependency audit.
- Production Next.js build and bundle analysis.
- Chromium E2E, including login redirect attacks, logout/back navigation, service-worker cache isolation, comment redaction, nested categories, media partial failure, and keyboard accessibility.
- Strict OpenSpec validation and `git diff --check`.

## Rollout order

Phases land in order because later work relies on the hardened transport and cache boundaries. Each phase must be green before the next begins. No phase may weaken authorization, public DTO minimization, or the existing Application-to-infrastructure dependency direction.
