## MODIFIED Requirements

### Requirement: Package layers preserve dependency direction
The package layers MUST preserve their existing dependency direction, and feature application modules MUST NOT bypass the feature persistence port to import infrastructure database implementations.

#### Scenario: Application imports database implementation
- **WHEN** a production application module imports a database connection, schema, query helper, or ORM package
- **THEN** the package boundary test fails with the violating file and import

#### Scenario: Domain imports technical layer
- **WHEN** a domain module imports identity, application, infrastructure, transport, UI, or App Router code
- **THEN** the package boundary test fails
