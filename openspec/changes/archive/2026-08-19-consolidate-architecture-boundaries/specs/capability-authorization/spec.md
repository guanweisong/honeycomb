## MODIFIED Requirements

### Requirement: Capability authorization is enforced at the transport boundary
All protected tRPC procedures MUST enforce capability authorization at the transport boundary, and their declared capabilities MUST come from the unified capability registry. Legacy role-based procedure wrappers and duplicated permission declarations MUST NOT be used in production code.

#### Scenario: Unauthorized caller reaches a protected procedure
- **WHEN** an unauthenticated or unauthorized caller invokes a protected procedure
- **THEN** the request is rejected before the procedure handler executes

#### Scenario: Procedure capability is not registered
- **WHEN** a protected procedure declares a capability absent from the registry
- **THEN** the static authorization audit fails
