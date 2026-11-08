# By-product Master

## Workflow

An authorized company user creates and maintains by-products before production output, inventory, and future sales documents use them. Supported types include bran, husk, rice polish, broken rice, dust, waste, and custom types. Each product requires both purchase and sales reference prices; these are defaults only and never override a price captured on an operational transaction.

## Data and relationships

By-products use the company-scoped `Item` entity with `kind = BY_PRODUCT`, KG base unit, and company-unique code. Migration `0014_by_product_type` adds a flexible `byProductType` label, allowing configured and custom categories. Purchase and sales reference values use existing `Item.purchasePrice` and `Item.salesPrice`. Stock and production activity are calculated from `StockMovement` ledger rows; balances are not duplicated on the item.

## Business, inventory, and accounting rules

- Creating a by-product requires its type and nonnegative purchase/sales reference prices. The dedicated create API atomically creates the item and both prices.
- By-product creation requires `items:CREATE` and `items:VIEW_FINANCIAL`; price reads and edits are isolated behind financial permissions. Ordinary item reads expose only whether reference prices are configured, never their values.
- Master-data edits do not change stock, customer/supplier balances, or accounting. Production output and stock changes remain posted inventory transactions.
- The by-product screen displays current factory stock from the signed movement ledger and production output from `PRODUCTION_OUT` movements.
- Sales activity is derived from signed `SALES_DISPATCH` and `SALES_RETURN` movements. The sale/dispatch posting workflow is a later numbered task; until it posts these sources, the ledger-backed sales figure remains zero. Reference prices are not treated as actual sale revenue.
- Historical by-product rows created before `byProductType` existed remain available. Users can assign the missing type while editing; no historical rows or prices are deleted.

## API, authorization, and validation

- `GET /api/v1/items?companyId=...&kind=BY_PRODUCT` lists searchable, paginated by-products with active filtering and redacted price state.
- `POST /api/v1/items/by-products` creates a type-classified by-product and both reference prices in one audited transaction; requires both `items:CREATE` and `items:VIEW_FINANCIAL`.
- `PATCH /api/v1/items/:id` updates name, code, type, grade, description, or active status and writes an audit event.
- `GET/PUT /api/v1/items/:id/reference-prices` reads or changes purchase/sales reference prices under the existing financial permission rules.
- `GET /api/v1/inventory/by-products?companyId=...&factoryId=...` returns paginated by-product stock, production, and net sales movement for the selected factory; requires `inventory:READ`.

DTOs restrict item/type lengths and price precision. Codes are normalized and company-unique. Cross-company reads and writes are rejected by the existing tenant guard and service scope checks.

## UI and verification

The bilingual By-product Master includes standard type choices and custom types, product fields, protected price create/edit dialogs, active status, search/pagination, and factory-scoped ledger totals. Users without inventory read permission see a permission message rather than fabricated stock figures; users without financial permissions cannot retrieve or change reference prices.

Tests cover protected price creation, missing-price rejection, DTO validation, cross-factory activity scope, and ledger calculations for stock, production, dispatch, and returns. Run backend tests/build, frontend typecheck/production build, and Prisma validation before deploying migration `0014_by_product_type`.
