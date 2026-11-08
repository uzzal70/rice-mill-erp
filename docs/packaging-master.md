# Packaging Master

## Workflow

Administrators create company-scoped packaging items with an arbitrary positive bag size, optional bag type and supplier, material, and unit cost. Authorized users can update the specification and active status. Packaging stock is displayed per selected factory from signed inventory-ledger movements; this master does not directly create or change stock.

## Data and calculations

- Each packaging item is an `Item` of kind `PACKAGING`, measured in `PIECE`.
- Its one-to-one `PackagingSpec` stores size in KG, bag type, material, optional supplier, and unit cost in BDT.
- There are no hard-coded package sizes. Seed data includes 5, 10, 20, 25, and 50 KG examples.
- Stock is the sum of ledger quantities for the item, company, and selected factory. Until a later inventory receipt workflow posts packaging movements, the displayed balance may be zero.
- Creating or editing a packaging master record does not post inventory or accounting entries.

## API and permissions

- `POST /api/v1/items/packaging` creates the item and specification atomically. It requires `items:CREATE` and `items:VIEW_FINANCIAL`.
- `PUT /api/v1/items/:id/packaging` updates specification, identity, supplier, and active status in one transaction; each change is audited.
- `GET/PUT /api/v1/items/:id/reference-prices` reads or changes packaging unit cost. Financial reads require `items:VIEW_FINANCIAL`; changes require both `items:UPDATE` and `items:VIEW_FINANCIAL`.
- `GET /api/v1/inventory/packaging-stock` lists factory-scoped ledger balances and requires `inventory:READ`.
- A supplier must be an active supplier in the same company. Item codes are normalized to uppercase and remain company-unique. Sizes must be positive and costs non-negative.
- Ordinary item reads expose the supplier identifier and specification but never unit cost. Cost changes are audited.

## UI and verification

The bilingual Packaging Master supports custom sizes, searchable/paginated active status, supplier selection, protected unit-cost editing, and factory stock. Backend tests cover creation, supplier scope, generic-create rejection, specification updates, cost-only update behavior, financial reads, and factory-ledger stock scope.
