# Factory Master

## Workflow

An authorized company user creates a factory, configures its operating profile, and maintains its status. Factory codes are normalized to uppercase and unique within their company. Deactivation preserves the record and history; an inactive factory can be viewed or reactivated but cannot accept operational writes.

## Data and relationships

`Factory` belongs to exactly one `Company` and has a company-scoped unique code. It stores its name, address, manager, optional daily capacity in KG, production type (`AUTO`, `PARBOILED`, `TRADITIONAL`, or `INTEGRATED`), configurable business modes, and active status. Existing factory relationships (godowns, production lines, memberships, and operational records) remain attached; factories are not hard-deleted.

## Business and data integrity

- Factory master data does not itself move stock or create financial postings.
- Every create or update is audited transactionally with before/after snapshots.
- Company-scoped duplicate codes produce a readable conflict response.
- Inactive factories reject operational writes while allowing factory-master updates needed for reactivation.
- Capacity is optional and stored as a decimal; the master does not assume a production calculation or accounting value from it.

## API and permissions

- `GET /api/v1/factories?companyId=...` lists active factories by default; `includeInactive=true` is available to authorized master-data users.
- `GET /api/v1/factories/:factoryId` reads a factory.
- `GET /api/v1/factories/capabilities?companyId=...` checks whether the caller can create a factory.
- `POST /api/v1/factories` creates a factory and audit event.
- `PATCH /api/v1/factories/:factoryId` updates profile fields or activates/deactivates the factory and audits the change.
- Create, read, and update use the corresponding `factories` RBAC permission. Company and factory scope are still enforced by the access guard.

DTO validation restricts production types and business-mode enum values, bounds names/codes/capacity, and rejects malformed or negative capacity. Service/controller errors remain human-readable.

## UI and verification

The bilingual Factory Master screen supports company selection, listing active and inactive factories, create/edit, status changes, and all factory profile fields. Operational factory selection continues to use active-only results.

Automated coverage validates DTO fields, transactional audit behavior, duplicate-code conflicts, optional capacity, inactive-factory write protection, and authorization. The targeted backend tests and build, frontend typecheck, and frontend production build passed for this task.
