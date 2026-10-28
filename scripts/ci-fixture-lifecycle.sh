# Sourced immediately after mktemp by CI lanes; owns only that lane's fixture.
cleanup() {
  status=$?
  cleanup_start=$(node -p 'Date.now()')
  trap - EXIT HUP INT TERM
  if [ -d "$HONEYCOMB_TEST_DIR" ] && [ ! -L "$HONEYCOMB_TEST_DIR" ] && [ "$(stat -c %u "$HONEYCOMB_TEST_DIR")" = "$(id -u)" ]; then
    rm -rf -- "$HONEYCOMB_TEST_DIR" || status=1
    test ! -e "$HONEYCOMB_TEST_DIR" || status=1
  else
    echo "Test directory cleanup could not verify ownership" >&2
    status=1
  fi
  cleanup_elapsed=$(( $(node -p 'Date.now()') - cleanup_start ))
  printf 'Fixture cleanup: %s ms (final exit=%s)\n' "$cleanup_elapsed" "$status"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    printf -- '- Fixture cleanup: %s ms (final exit=%s)\n' "$cleanup_elapsed" "$status" >> "$GITHUB_STEP_SUMMARY" || status=1
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
phase() {
  local label="$1"; shift
  local start elapsed code
  start=$(node -p 'Date.now()')
  echo "::group::$label"
  if "$@"; then code=0; else code=$?; fi
  elapsed=$(( $(node -p 'Date.now()') - start ))
  printf '%s: %s ms (exit=%s)\n' "$label" "$elapsed" "$code"
  echo "::endgroup::"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    if ! printf -- '- %s: %s ms (exit=%s)\n' "$label" "$elapsed" "$code" >> "$GITHUB_STEP_SUMMARY"; then
      if [ "$code" -eq 0 ]; then code=1; fi
    fi
  fi
  return "$code"
}
