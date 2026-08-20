# Feature Structure

## 新增要求

### Requirement: simple features use minimal entrypoints

简单 CRUD feature MUST keep business orchestration in `service.ts` and MUST NOT create empty `admin`, `public`, or `transport` directories solely for convention.

#### Scenario: simple feature has one entrypoint

- **WHEN** a simple feature exposes an admin or public capability
- **THEN** the capability is exported from a feature-root entrypoint or a directory containing multiple cohesive files
- **AND** consumers do not import an internal forwarding file

### Requirement: complex domain boundaries remain intact

The `post`, `comment`, and `user` features MUST retain their domain invariants and domain tests during directory flattening.

#### Scenario: domain rule is migrated

- **WHEN** an entrypoint is moved
- **THEN** domain behavior and its public contract remain unchanged
- **AND** no Drizzle or Next.js dependency is introduced into the domain

### Requirement: external contracts remain compatible

The refactor MUST preserve existing route segments, tRPC procedure names, capability identifiers, authorization outcomes, and database schema.

#### Scenario: existing client calls a procedure

- **WHEN** an existing client calls a current tRPC procedure
- **THEN** it resolves to the same behavior after the directory refactor
