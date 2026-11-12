#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" == "Darwin" && -d /private/tmp ]]; then
  export TMPDIR=/private/tmp
fi

export NEXT_PUBLIC_SITE_URL=https://example.test
export AUTH_SECRET=ci-build-only-test-secret-32-characters-long
export AUTH_URL=https://example.test
export E2E_SEED=1
export HONEYCOMB_TEST_DIR="$(mktemp -d "${TMPDIR:-/tmp}/honeycomb-test.XXXXXXXX")"
source scripts/ci-fixture-lifecycle.sh
prepare_fixture

phase "Type checks" bash -e -o pipefail -c \
  'bun --no-env-file run --bun next typegen && bun --no-env-file run --bun tsc --noEmit'
phase "Lint" bun --no-env-file x --bun eslint .
phase "OpenSpec and diff checks" bash -e -o pipefail -c \
  'bun --no-env-file run --bun openspec validate --all --strict && bun --no-env-file scripts/check-diff.ts'
phase "Full unit tests" bun --no-env-file run --bun vitest run
