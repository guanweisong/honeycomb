#!/usr/bin/env bash
set -euo pipefail

base_sha="${1:?Usage: classify-quality-changes.sh <base-sha> <head-sha>}"
head_sha="${2:-HEAD}"
output_file="${GITHUB_OUTPUT:-/dev/stdout}"

high_risk=false
has_test_targets=false
requires_production_e2e=false

if [[ "$base_sha" =~ ^0+$ ]]; then
  changed_files="$(git diff-tree --root --no-commit-id --name-only -r "$head_sha")"
else
  changed_files="$(git diff --name-only "$base_sha" "$head_sha")"
fi

while IFS= read -r path; do
  [[ -n "$path" ]] || continue

  case "$path" in
    src/*.ts|src/*.tsx|src/*.mts|src/*.cts|tests/*.ts|tests/*.tsx|tests/*.mts|tests/*.cts|scripts/*.ts|scripts/*.tsx|scripts/*.mts|scripts/*.cts|next.config.ts|playwright.config.ts|vitest*.config.mts)
      has_test_targets=true
      ;;
  esac

  case "$path" in
    src/auth.ts|src/auth-*.ts|src/proxy.ts|src/app/auth/*|src/app/admin/*|src/app/api/*|src/app/trpc/*|src/app/lib/server/*|src/app/sitemap.xml/*|src/app/sitemaps/*|src/lib/auth/*|src/lib/trpc/*|src/lib/db/*|src/lib/http/client-ip.ts|src/lib/security/*|src/lib/rate-limit/*|src/lib/cache/*|src/lib/content/*|src/lib/observability/*|src/features/*/server/*|src/features/*/*router.ts|src/features/user/*|src/features/admin/*|src/features/media/*|src/lib/storage/*|src/app/pwa/*|src/lib/pwa/*|drizzle/*|migrations/*|*.sql|scripts/migrate-database.ts|scripts/check-migrations.ts|scripts/backup-remote-database.ts|scripts/audit-persistence-invariants.ts|scripts/audit-production-schema.ts|scripts/e2e-*.ts|scripts/seed-e2e.ts|scripts/ci-fixture-lifecycle.sh|scripts/classify-quality-changes.sh|.github/workflows/quality*.yml|next.config.ts|playwright.config.ts|vitest*.config.mts|tests/e2e/*|tests/tooling/e2e-*.test.ts|tests/tooling/ci-fixture-lifecycle.test.ts)
      high_risk=true
      ;;
  esac

  case "$path" in
    src/app/pwa/*|src/lib/pwa/*|scripts/e2e-*.ts|scripts/seed-e2e.ts|scripts/ci-fixture-lifecycle.sh|playwright.config.ts|tests/e2e/*)
      requires_production_e2e=true
      ;;
  esac
done <<< "$changed_files"

{
  printf 'high_risk=%s\n' "$high_risk"
  printf 'has_test_targets=%s\n' "$has_test_targets"
  printf 'requires_production_e2e=%s\n' "$requires_production_e2e"
} >> "$output_file"
