# Stock Ledger

## Status
In progress. Per-item/location movement summaries and stock count reconciliation are implemented. Opening transactions and advanced report filters/export remain.

## 1. Business workflow
- Stock position is derived from append-only stock movements, never a mutable balance field.
- The ledger groups each item at its stack (or no-stack location) and reports opening quantity, positive in, positive out, and current balance.
- A stock count records book quantity and physical count as a draft. Posting rejects stale counts if any movement changed the item/stack balance since the count was recorded. It creates a signed adjustment movement for the difference and posts the count atomically. A zero difference posts the count without a zero-quantity movement.
- A correction requires a new count and reconciliation; posted counts are immutable.

## 2. Database entities
- `StockCount`: company/factory/document number, item/stack, book/count/delta quantities, unit, status, reason, count timestamp, creator and poster.
- Unique count number per company; migration `0022_stock_counts`.
- Existing `StockMovement` remains the balance source.

## 3. Relationships
- Stock count and movement are tenant/factory/item/stack scoped. Compound keys prevent cross-company or cross-factory placement.
- The reconciliation movement uses source type `STOCK_COUNT` and references the immutable count record.

## 4. Calculations
- Opening = signed sum of `OPENING` movements.
- In = sum of positive quantities for non-opening movements.
- Out = absolute sum of negative quantities for non-opening movements.
- Balance = sum of all movement quantities, including opening.
- Count difference = counted quantity − book quantity, using the item's base unit and three decimal places.

## 5. Accounting impact
- Count reconciliation changes stock quantity only. Valuation and journal effects are not yet implemented.

## 6. Inventory impact
- Positive reconciliation checks the stack's remaining KG capacity using company unit conversion. Negative reconciliation cannot make item stock negative because the count must be non-negative and posting requires the book balance to remain unchanged since count capture.
- Posting an adjustment and changing the count status are atomic.

## 7. API
- `GET /inventory/stock` — paginated ledger balance and movement totals.
- `GET /inventory/stock-counts` — scoped count register.
- `POST /inventory/stock-counts` — create a count snapshot.
- `POST /inventory/stock-counts/:id/post` — reconcile and post.

## 8. Permissions
- `inventory:READ` for ledger/count register; `inventory:CREATE` to record a count; `inventory:POST` to reconcile. Company/factory scope is required.

## 9. Validation
- Item and stack must be active and belong to the company/factory. Count quantity is non-negative and reason is mandatory.
- Duplicate count numbers fail; stale snapshots fail with a refresh-and-recount message.

## 10. UI
- Inventory desk displays opening/in/out/balance with location and stack lot metadata, supports count creation, and posts pending reconciliation.

## 11. Reports
- Paginated register and movement summary are available. Date ranges, export/print and valuation reconciliation remain outstanding.

## 12. Tests
- Existing inventory integration tests do not yet cover stock counts; stale-count, zero-difference, capacity and unit conversion coverage remains required.

## 13. Implementation and verification
- Added `StockCount` schema/migration, count APIs, ledger totals, and bilingual stock-ledger/count UI.
- Prisma Client generation, backend build, and frontend typecheck pass. Migration application and automated tests were not run.
- Remaining: apply migration, add focused tests, opening-balance workflow, advanced filters/export and inventory valuation/accounting.
