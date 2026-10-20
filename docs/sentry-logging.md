# Sentry logging

The existing server Logger writes structured events to both local JSON console
output and Sentry Logs. Metrics and browser logging remain unchanged. Browser error capture is described below.

## Setup

Use the `honeycomb` Next.js project in organization `honeycomb-yk`. Set its DSN as
`NEXT_PUBLIC_SENTRY_DSN` in the deployment environment before building, then redeploy. Configure
Production and Preview separately as needed; do not commit the DSN.
No administrative auth token is needed.

Without a DSN, logging is unchanged. Initialization is skipped during builds and
on Edge. SDK initialization or sink failure must not fail business operations.
Open Sentry Logs, filter `service:honeycomb` and the desired environment, and
verify a real server event after deployment. Passing tests alone do not prove
live ingestion.

## Server scope and privacy

- Existing recursive redaction is applied before forwarding context. Nested
  attributes become JSON strings; scalar attributes remain searchable.
- Automatic console capture is disabled to avoid duplicates and loops.
- No automatic request, user, exception, tracing, profiling, or Replay capture.
  Hostname and SDK data collection are explicitly disabled.
- Error events go to Logs, not Issues. Client console logs and metrics are not
  forwarded.
- Keep server log SDK usage in this adapter; never add credentials, raw requests, or user
  data to Sentry scope attributes or log context.
- Environment comes from `VERCEL_ENV` or `NODE_ENV`; optional release comes from
  `VERCEL_GIT_COMMIT_SHA`.
- Vercel's request-context `waitUntil` allows buffered logs to flush. Delivery is
  best-effort, not a durable audit trail.

No persistent agent connection, source-map upload or paid feature is configured.
Log ingestion counts toward your plan's limits. Verify receipt and redaction in
Sentry after deployment without using real secrets as test inputs.

## Browser errors

Both public pages and admin report uncaught JavaScript errors, unhandled promise
rejections and their existing React error-boundary errors to Sentry Issues.
Set **`NEXT_PUBLIC_SENTRY_DSN`** in Production and Preview before building. The
server now uses this same variable; `SENTRY_DSN` remains a server-only migration
fallback. After verifying the new deployment, the old variable can be removed.
No second DSN or mapping is required. Without the public variable, browser
initialization is skipped, even if the old server variable still exists.

The DSN is a public ingestion identifier, not an administrative credential.
Never prefix an auth token or any other secret with `NEXT_PUBLIC_`. Next.js
embeds public variables at build time, so changes require a new build/deployment.
The CSP permits connections only to the configured DSN origin.

Browser collection is errors only: no Replay, sessions, performance tracing,
browser logs, console breadcrumbs, request headers/bodies, user identities or
custom scope data. Arbitrary error messages and custom error names are redacted
because they can contain user content or secrets. Standard error types and
compiled `/_next/static/*.js` frame paths/line/column are retained; URL origins,
query strings and fragments are discarded. This limits diagnostic detail in
exchange for privacy. Source maps are not uploaded, so production frames may be
minified. No Sentry auth token is needed.

Tests use the real browser SDK with an in-memory transport and synthetic data;
they do not send production events. After an authorized deployment, verify a
naturally occurring event in Issues. Local tests do not prove live ingestion.

References: [Sentry manual setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
and [Next.js client instrumentation](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client).
