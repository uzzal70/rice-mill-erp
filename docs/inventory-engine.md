# Inventory Engine

## Status
In progress. Generic unit-aware transfers and adjustments are implemented; source workflows for several transaction types and the full item-category UI remain open.

## 1. Business workflow
- Every persisted stock movement is signed: positive increases stock and negative decreases stock. Balances are derived from movements.
- GRN, production, transfer, and adjustment flows write movements in the same transaction as their source document and audit event.
- Stock transfer records two opposite movements. Adjustment is an explicit signed quantity with a required reason.
- No API silently edits a balance. Movement corrections require an explicit future reversal process.
- Tenant/factory scopes are enforced on each source and stock location.

## 2. Database entities
- Items are classified as paddy, rice, by-product, packaging, fuel, spare part, consumable, or other.
- StockMovement remains the immutable movement journal with item, unit, location, source, timestamp, and signed quantity. Transaction type values now include the master prompt's opening, transfer directions, purchase/sales returns, repack, damage and loss categories.
- Migration `0021_inventory_item_types` extends the item and movement enums.

## 3. Relationships
- Existing company/factory/item/stack foreign keys preserve tenant and warehouse boundaries. Movement source records link back through source type and ID.
- Transfer and adjustment records remain source documents; ledger rows are append-only.

## 4. Calculations
- Item balances are sums of signed movements in that item's base unit.
- Stack occupancy and physical capacity are KG. Non-KG movement quantities are converted through the company's effective unit-conversion graph; missing conversions fail. This avoids mixing bags, liters, pieces and weight in stack capacity.
- Negative item balances are rejected for transfers and adjustments. A transfer into a stack cannot exceed its KG capacity.

## 5. Accounting impact
- Current inventory movements do not post journals. Inventory valuation and GL reconciliation remain future work.

## 6. Inventory impact
- Receipt, production, transfer and adjustment movement writes are atomic with their source document. Repacking now has a draft/approve/post workflow that atomically issues source rice, receives finished rice, and consumes factory packaging stock. Opening balance, sales, sale return, purchase return, damage, and loss source workflows remain outstanding. Repacking migration `0023_repacking_batches` is pending deployment; accounting valuation is not included.
- Generic transfers and adjustments accept active item types and record the item's base unit.

## 7. API
- Existing routes: `GET /inventory/stock`, `GET /inventory/transactions`, `POST /inventory/transfers`, and `POST /inventory/adjustments`.
- Transfer and adjustment lists remain paginated/read scoped; writes are company/factory scoped and audit source documents.

## 8. Permissions
- `inventory:READ` for stock and transaction reads; `inventory:POST` for transfers and adjustments. Company/factory scope is required.

## 9. Validation
- Items and stacks must belong to the same company/factory; source and destination stacks must be active and different.
- Quantity must be positive for transfer and non-zero for adjustment. Transfer or positive adjustment is rejected when stock/capacity constraints fail.
- Capacity calculations require a valid effective conversion to KG for non-KG units.

## 10. UI
- Warehouse management shows ledger-derived stock and KG-based occupancy. Dedicated forms for transfer, adjustments, opening stock, and other movement sources remain pending.

## 11. Reports
- Paginated stock balances and immutable transaction register are available. Filters/exports for every transaction category and stock valuation are pending.

## 12. Tests
- Existing focused inventory tests cover paddy receipt/transfer/adjustment behavior. New generic unit conversion and non-paddy transfer cases require test coverage.

## 13. Implementation and verification
- Changed: Prisma enums, migration `0021_inventory_item_types`, unit-aware occupancy/capacity and generic transfer/adjustment behavior, phase documentation.
- Backend build passes; migration application and automated tests were not run.
- Remaining: opening balances and other source workflows, transfer/adjustment UI, movement reversals, valuation, report/export, and generic item master UX.
