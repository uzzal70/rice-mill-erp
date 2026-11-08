# Rice Product Master

## Workflow

An authorized company user creates and maintains rice products before production output, packaging, inventory, and sales documents use them. Product type, brand, composition targets, and a default packaging label are configurable per company. Products are deactivated instead of deleted to preserve historical references.

## Data and relationships

Rice products use the existing company-scoped `Item` entity with `kind = RICE` and KG base unit. Fields include product name, unique company code, brand, rice type, variety, grade, head-rice percentage, broken-rice percentage, default packaging label, and active status. No schema migration is required.

Rice types offer Parboiled, Atap, Miniket, Najirshail, Premium, and Broken values; a custom type can be entered without a code change. The packaging field is a configurable display/default label, not a packaging-stock reservation. Physical packaging items remain managed through packaging inventory.

## Business and data integrity

- Rice type and both head-rice/broken-rice target percentages are required.
- Each percentage must be from 0 to 100 with at most two decimal places; their sum cannot exceed 100%.
- Product composition percentages are configurable master targets, not a fixed recovery assumption or a substitute for measured production output.
- Creating or editing a rice product does not move stock, create sales, or post accounting. Those effects belong to operational source transactions.
- Code normalization and company-scoped uniqueness prevent collisions. Updates preserve required composition values, allow optional labels to be cleared, and produce audit events.

## API and permissions

- `GET /api/v1/items?companyId=...&kind=RICE` lists rice products with search, pagination, and optional active-status filtering.
- `GET /api/v1/items/:id?companyId=...` reads a product.
- `POST /api/v1/items` creates a `RICE` item.
- `PATCH /api/v1/items/:id` updates profile fields and active status.
- Routes use `items:READ`, `items:CREATE`, and `items:UPDATE`; the service retains the item's kind and enforces company scope.

## UI and verification

The bilingual Rice Product Master provides a searchable, paginated register; active/inactive filters; create/edit; standard rice type choices; custom rice type input; composition percentages; and custom packaging labels. Backend validation errors are presented in the form.

Unit tests cover mandatory composition, the combined-percentage limit, custom type/package-label persistence, and partial status updates. Backend tests/build and frontend typecheck/production build are the verification gates.
