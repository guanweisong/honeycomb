# Runtime Quality Hardening Design

## Goal

Close the engineering gaps identified in the current repository review while
preserving the existing modular-monolith architecture and deployment targets.

## Scope

- Restore a passing coverage gate for all declared critical files.
- Enforce a high-entropy Better Auth secret at production startup.
- Migrate the deprecated Next.js `middleware` convention to `proxy`.
- Make production API rate limiting fail closed when its Redis dependency is
  absent or unavailable, while retaining explicit local-development behavior.
- Add App Router loading and error recovery boundaries for the public and admin
  experiences.
- Add a GitHub Actions workflow that runs type checks, linting, unit coverage,
  a production build, Cloudflare build verification, and targeted E2E tests.
- Upgrade direct and transitive dependencies, then re-audit the resolved lockfile.

## Architecture

The existing domain, infrastructure, application, tRPC, and UI boundaries stay
unchanged. Runtime hardening remains in the environment, infrastructure, and
route layers: environment parsers own startup guarantees; `proxy.ts` owns
edge-safe request gating; route-segment boundaries own recovery UI; CI owns
non-bypassable verification.

The rate limiter receives an explicit runtime policy. Development and test may
use an in-memory allow policy only when explicitly selected. Production requires
Upstash configuration and converts upstream limiter failures to a controlled
503 response rather than silently allowing requests.

## Data Flow

1. `instrumentation.register` validates production environment variables before
   serving requests. `AUTH_SECRET` must be a random-looking value of at least
   32 characters.
2. `proxy.ts` first applies API rate limits and then delegates non-API routes to
   next-intl routing. It emits 429 for a quota breach and 503 when a required
   limiter cannot be used.
3. Route loading and error boundaries render accessible recovery UIs without
   exposing internal failures; error boundaries offer reset where retry is safe.
4. GitHub Actions installs from the Bun lockfile and blocks merges on all
   quality, build, and dependency-audit checks.

## Dependency Policy

Use the newest versions that resolve known advisories. Accept breaking upgrades
only when required and adapt source code plus tests. Audit findings will be
classified by resolved production reachability; direct and production-reachable
high or critical advisories must be eliminated or documented with a bounded,
reviewable exception.

## Testing and Acceptance Criteria

- New behavior is test-first: tests must fail before implementation and pass
  afterward.
- `bun run check-types`, `bun run lint`, `bun run test:unit:coverage`,
  production build, Cloudflare build verification, and selected E2E tests pass.
- No Next.js middleware-deprecation warning is emitted during the production
  build.
- All declared critical coverage thresholds pass.
- The audit result contains no unresolved direct or production-reachable high
  or critical advisory without an explicit documented exception.

## Non-goals

- Replacing the current application architecture or adding a managed telemetry
  backend.
- Rewriting unrelated UI components solely to increase aggregate coverage.
