# Dependency Audit Exceptions

The production audit blocks every reachable High or Critical advisory unless an
entry exactly matches both its advisory ID and its fully versioned dependency
path. Exceptions are rejected when their owner or mitigation is empty, their
path contains a wildcard, or their expiry has passed.

## Active

### GHSA-c2c7-rcm5-vvqj

- Path: `next-intl@4.14.2>@parcel/watcher@2.5.6>picomatch@4.0.3`
- Expires: 2026-12-01
- Owner: maintainer
- Reason: `@parcel/watcher` and this `picomatch` path watch trusted source paths
  during local/build tooling. Production requests do not invoke it or supply its
  glob patterns. Bun does not support nested overrides, while a global
  `picomatch@4` override would violate unrelated consumers that require v2.
- Follow-up: remove the exception as soon as `next-intl` or `@parcel/watcher`
  resolves `picomatch >=4.0.4`.

The machine-readable source is
`scripts/dependency-audit-exceptions.json`; this document must be updated with
it.
