# Company master

## Business purpose

The company record is the legal and financial identity for one tenant. Factories, company memberships, roles, settings, and operational records belong to the company; company master edits do not change posted inventory, balances, or accounting entries. The application stores a logo URL rather than uploading an image; a managed file-storage workflow is not part of this master-data implementation.

## Fields and defaults

| Field | Storage and validation |
|---|---|
| Company name | Required, 2–160 characters |
| Company code | Required, 2–24 characters, normalized to uppercase, globally unique |
| Logo | Optional absolute URL |
| Registration number, TIN, BIN | Optional text identifiers |
| Address, district, division | Optional address data |
| Phone, email, website | Optional contact details; email and website are validated |
| Fiscal year | `fiscalYearStart`, a configurable month from 1 to 12 |
| Currency | Three-letter code, normalized uppercase; defaults to `BDT` |

Fields map to the normalized `Company` tenant record. Bangladesh display uses BDT; other currencies may be configured per company. VAT/AIT/TDS/VDS configuration and fiscal-period accounting controls are separate financial modules and are not implied by this company profile.

## Workflow and API

- Platform administrators create a company through `POST /api/v1/companies`. The operation transactionally creates its owner role and membership, assigns the creator, and records the company creation audit event. It requires the seeded permission catalog so the owner role is not created without grants.
- A user with company-scoped `companies:READ` can read an accessible profile through `GET /api/v1/companies/:companyId`; `GET /api/v1/companies` lists active companies for the signed-in user's memberships.
- A user with company-scoped `companies:UPDATE` edits the profile through `PATCH /api/v1/companies/:companyId`. Empty updates, invalid fiscal months/currency/URLs, unknown records, and duplicate codes are rejected. Clearing optional text fields stores `NULL`.
- `GET /api/v1/companies/capabilities` returns company-creation availability only to users with the platform-scoped create permission. The Company profile screen uses this to expose creation only to authorized users; company profile changes never grant additional permissions.
- Create/update and audit records share a database transaction. Every change records before/after values and actor identity. Company scope is enforced by the access guard for the path company ID.

## UI and verification

The Company profile management screen supports create for authorized platform administrators and edit for accessible tenant companies. It includes legal identifiers, logo URL, address/contact information, fiscal-year start month, and base currency, with English and Bangla labels. Server-side validation remains authoritative.

Backend tests cover profile creation and owner setup, missing permission-catalog rollback, updates and audit snapshots, duplicate-code conflicts, empty/missing records, and DTO validation. Frontend typecheck and production build are required for changes to this screen.
