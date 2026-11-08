# Paddy Master

## Workflow

An authorized company user creates and maintains paddy varieties before procurement, quality, inventory, or production documents use them. A paddy item is deactivated rather than deleted so historical transactions and references remain intact. Catalog records are company-scoped; the same variety may be configured independently by different companies.

## Data and relationships

Paddy varieties use the existing `Item` entity with `kind = PADDY`, company-unique code, and KG base unit. Fields include paddy name, variety, local name, crop year, grade, standard moisture, standard recovery, description, and active status. No schema migration is required. Transactions continue to reference the item ID and preserve their own transaction snapshots.

## Business rules and impact

- Variety, standard moisture, and standard recovery are required for every paddy item.
- Moisture and recovery are stored as percentage baselines from 0 to 100. They are inputs for later configurable procurement/production calculations; this master does not apply deductions or assume actual recovery.
- Paddy master create/update does not move stock, create supplier balances, or post accounting. Those effects occur only from their operational source transactions.
- Inactive paddy items remain readable for historical traceability but are not eligible for new inventory workflows that require an active item.
- Updates preserve required quality baselines; name/code are normalized, optional local name/grade/year/description can be cleared, and changes are audited.

## API, authorization, and validation

- `GET /api/v1/items?companyId=...&kind=PADDY` lists paddy items with search, pagination, and optional `active=true|false`.
- `GET /api/v1/items/:id?companyId=...` reads the item.
- `POST /api/v1/items` creates a `PADDY` item with KG base unit.
- `PATCH /api/v1/items/:id` updates profile fields and active status.
- Routes use `items:READ`, `items:CREATE`, and `items:UPDATE`; the access guard enforces company membership and the service keeps the item kind fixed.

DTO validation bounds text, crop year, and percentage precision/ranges. Business validation requires a nonblank variety and both standard percentages. Duplicate company item codes produce a readable conflict. Every mutation writes an audit event; ordinary reads do not expose financial reference prices.

## UI and verification

The bilingual Paddy Master register supports searchable, paginated active/inactive filters, create/edit, and explicit status control. It displays the required variety and quality baselines and reports API validation errors in the form.

Tests cover required paddy quality baselines, active filtering, query transformation, nullable optional profile fields, and partial profile/status updates. Backend build and focused tests, plus frontend typecheck, passed.
