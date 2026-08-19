## ADDED Requirements

### Requirement: Application uses business persistence ports
Feature application modules MUST depend on business-named ports or domain contracts and MUST NOT import database instances, Drizzle schemas, Drizzle query helpers, or ORM packages directly.

#### Scenario: Application module is scanned
- **WHEN** the boundary test scans a production file under `src/features/*/application`
- **THEN** imports of database connections, schema modules, query helpers, `drizzle-orm`, and infrastructure database implementation are rejected

### Requirement: Infrastructure adapters own persistence implementation
Feature infrastructure adapters SHALL contain database-specific queries and SHALL implement the ports consumed by application modules.

#### Scenario: Adapter executes a query
- **WHEN** an application use case invokes a feature persistence port
- **THEN** the adapter performs the existing database operation without exposing ORM types through the port

### Requirement: Existing behavior remains compatible
The migration MUST preserve public route behavior, tRPC procedure names, database schema, cache keys, error semantics, and transaction boundaries.

#### Scenario: Existing caller invokes a migrated use case
- **WHEN** a current transport or server entry calls a migrated application use case
- **THEN** it receives the same result or error contract as before
