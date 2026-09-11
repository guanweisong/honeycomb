# Production migration report

## Target and backup

- Date: 2026-09-11
- Sanitized target: `libsql://honeycomb-guanweisong.aws-ap-northeast-1.turso.io`
- Backup directory: `/Users/guanweisong/Documents/backups/honeycomb/20260911T110710Z`
- Backup integrity: `ok`
- Pre-migration parent counts: category 16, post 56, page 1, setting 1, tag 242

SHA-256:

- `honeycomb.db`: `53845875d52b0faa2b71938ef86f059ffe923811ba033c7d615d6ab1137b0f99`
- `honeycomb.db-info`: `e8a1ae7a031348b949cf5deb7248a53bd0bbb61f5a0a6462f9a70352c8f24d4f`
- `honeycomb.db-shm`: `30659c06d39bc3120b69ee794d3f54332e87433ec11609a2a9a08b830731fa84`
- `honeycomb.db-wal`: `b23ff8876269131bd199bd18778070d5bd3a09956bf4a31c26f77f48d8e9ea4a`

## Migration result

- Command: `bun run db:migrate`
- Result: succeeded
- Ledger hashes: baseline `72a1c0df496985446b0beb5c5fa140d6b28316a6105dac1b13be2c84d0ab620a`, migration 0001 `194cfce16ec9f8bcc846b3a0f713c1b035629b8a6bbd9fe356d755d43663b0fd`, migration 0002 `e86269e69154b41748692ac0bb4d7a99956e8127edd54cf8f5ada1c7e5591f16`
- Post-migration parent counts: category 16, post 56, page 1, setting 1, tag 242
- Translation counts: category 32, post 112, page 2, setting 2, tag 484
- Missing required translations: 0
- Orphan translations: 0
- Legacy multilingual columns remaining: 0
- Post-migration integrity: `ok`

## Verification boundary

- 296 unit-test files and 1399 tests passed.
- Type checking, lint, migration governance, strict OpenSpec validation, and diff checks passed.
- The production migration was rehearsed successfully against a private copy of the remote backup before execution.
- E2E was intentionally not run, as requested.
- Application deployment is intentionally pending separate authorization.
