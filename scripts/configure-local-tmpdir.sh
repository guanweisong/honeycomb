# Keep macOS temporary paths canonical for filesystem safety checks.
if [ "$(uname -s)" = "Darwin" ] && [ -d /private/tmp ]; then
  export TMPDIR=/private/tmp
fi
