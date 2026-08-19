## ADDED Requirements

### Requirement: Capability registry is the authorization source
All protected production entry points MUST reference a capability registered in the capability registry, and the registry MUST contain every supported permission exactly once.

#### Scenario: Unknown capability is declared
- **WHEN** a tRPC procedure, Admin Action, Admin route, or menu entry declares an unknown capability
- **THEN** type checking or the static boundary test fails

### Requirement: Protected entry points are auditable
The registry and static checks SHALL identify the entry point category and stable identifier for every protected tRPC procedure, Admin Action, Admin route, and menu entry.

#### Scenario: Protected entry point has no registry binding
- **WHEN** the authorization audit scans production entry points
- **THEN** the audit fails and reports the file and entry point without a capability binding

### Requirement: Authorization behavior is unchanged
The registry migration MUST preserve the existing role-to-capability mapping and the existing unauthorized and forbidden outcomes.

#### Scenario: User lacks a required capability
- **WHEN** a user invokes a protected entry point without its registered capability
- **THEN** the system returns the existing unauthorized or forbidden result according to the current authentication state
