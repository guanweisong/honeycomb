# Sentry logging

The existing server Logger writes structured events to both local JSON console
output and Sentry Logs. Metrics and browser logging remain unchanged.

## Setup

Use the `honeycomb` Next.js project in organization `honeycomb-yk`. Set its DSN as
`SENTRY_DSN` in the server deployment environment, then redeploy. Configure
Production and Preview separately as needed; do not commit the DSN or use a
`NEXT_PUBLIC_` variable. No administrative auth token is needed.

Without a DSN, logging is unchanged. Initialization is skipped during builds and
on Edge. SDK initialization or sink failure must not fail business operations.
Open Sentry Logs, filter `service:honeycomb` and the desired environment, and
verify a real server event after deployment. Passing tests alone do not prove
live ingestion.

## Scope and privacy

- Existing recursive redaction is applied before forwarding context. Nested
  attributes become JSON strings; scalar attributes remain searchable.
- Automatic console capture is disabled to avoid duplicates and loops.
- No automatic request, user, exception, tracing, profiling, or Replay capture.
  Hostname and SDK data collection are explicitly disabled.
- Error events go to Logs, not Issues. Client console logs and metrics are not
  forwarded.
- Keep SDK usage in this adapter; never add credentials, raw requests, or user
  data to Sentry scope attributes or log context.
- Environment comes from `VERCEL_ENV` or `NODE_ENV`; optional release comes from
  `VERCEL_GIT_COMMIT_SHA`.
- Vercel's request-context `waitUntil` allows buffered logs to flush. Delivery is
  best-effort, not a durable audit trail.

No persistent agent connection, source-map upload or paid feature is configured.
Log ingestion counts toward your plan's limits. Verify receipt and redaction in
Sentry after deployment without using real secrets as test inputs.
