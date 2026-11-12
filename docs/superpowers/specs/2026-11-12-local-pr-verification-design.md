# Local PR Verification Design

## Intent

Give contributors one predictable local command for the checks that do not require a browser, and leave production browser verification to the existing PR workflow. This removes repeated database setup and avoids local `.env` and Chromium sandbox issues.

## Goals

- Add `bun --no-env-file run verify:pr` for type checking, lint, OpenSpec validation, and the full unit suite.
- Use the existing isolated SQLite fixture lifecycle and clean it on success, failure, or interruption.
- Keep environment files and developer databases untouched.
- Document that GitHub PR checks remain the final gate for production E2E and builds.

## Non-goals and anti-goals

- Do not run production Chromium E2E in the local command.
- Do not replace, weaken, or duplicate the GitHub workflow's conditional lanes.
- Do not read, move, overwrite, or delete `.env*` files, and do not use a remote database.

## Approaches

1. Run the full CI workflow locally, including production E2E. Rejected because it repeats the local browser permission and clean-source setup problems this change is meant to remove.
2. Run one local non-browser verification command and rely on PR CI for production E2E and build checks. Chosen because CI already owns those checks and runs in a clean Linux environment.
3. Add an `act` wrapper for GitHub Actions. Rejected because it adds a Docker dependency while still leaving host browser behavior and local environment setup to manage.

## Design

The package command will call a small shell orchestrator. The documented invocation disables Bun's automatic dotenv loading. On macOS the script will use `/private/tmp` when available to avoid non-canonical temporary paths. It will create an exclusive temporary test directory, source `scripts/ci-fixture-lifecycle.sh` immediately, prepare the local SQLite database, and run the same underlying type-check, lint, strict OpenSpec, diff-policy, and full Vitest commands in sequence. Each phase uses Bun's `--no-env-file` flag. Existing package commands remain independently available. The fixture lifecycle script owns cleanup; any failed phase stops the run and returns a nonzero exit.

The project test-workflow documentation will describe the one-command local path and the PR CI checks that remain authoritative for production E2E/build verification.

## Constraints

- The command must work from the repository root with Bun and existing dependencies installed.
- Bun commands in the runner and fixture lifecycle helper must use `--no-env-file` where supported.
- The database fixture must remain local, exclusive, and automatically removed.
