# Milling Production

## Status
Backend and bilingual workflow UI implemented; machine registry, costing, and reversal are not implemented.

## 1. Business workflow
- Operator creates a draft batch with paddy input and one or more rice/by-product/other outputs at destination stacks. Production manager approves; authorized user posts.
- Draft → approved → posted. Posting is immutable; correction/reversal is future work.
- Optional production line is factory-scoped. Machine assignment is not available because a machine registry does not exist.

## 2. Database entities
- `ProductionBatch`: batch number, input item/stack/quantity, line, start/end, output/loss/recovery snapshots, status and actors.
- `ProductionOutput`: output item/stack/quantity per batch.
- Existing migration `0006_production_batches`; line linkage migration `0013_production_line_reference`.

## 3. Relationships
- Input item and outputs belong to one company; stacks and optional line belong to that company's selected factory.
- Output item/stack pairs cannot repeat in one batch.

## 4. Calculations
- Server calculates total output, process loss, head-rice, total-rice and by-product recovery from measured inputs/outputs. Classification uses rice product type and item kind.
- Output cannot exceed input. Recovery formulas and warning are documented in [recovery-calculation.md](recovery-calculation.md).

## 5. Accounting impact
- Batch costs and journal entries are not yet posted.

## 6. Inventory impact
- Posting atomically issues paddy and receives each output into its destination stack, with negative-stock and capacity validation.

## 7. API
- `GET/POST /production/batches`; `POST /production/batches/:id/approve`; `POST /production/batches/:id/post`.
- `productionLineId` is optional and validated against the selected active factory.

## 8. Permissions
- `production:READ/CREATE/APPROVE/POST`; production-line selection also needs `production-lines:READ`.

## 9. Validation
- Active paddy input in KG; rice, by-product, or other output in KG; active stacks; positive quantities; valid timestamps; non-overlapping item/stack outputs; total output no greater than input.

## 10. UI
- Bilingual batch desk captures input, optional production line, time range, and multiple output item/stack/quantity rows; lists recovery and low-standard warning, with approval/post actions.

## 11. Reports
- Paginated batch register includes outputs and recovery values. Print/export and machine utilization remain.

## 12. Tests
- Existing production calculation/service tests cover mass balance, recovery, stock posting, low-standard warning, insufficient input and capacity.

## 13. Implementation and verification
- Added production batch desk and production-line selector; seeded line-read permission for production manager/operator roles.
- Backend build and frontend typecheck pass; automated tests were not run in this turn.
- Remaining: machine registry/assignment, actual/weighted average/FIFO/standard costing, by-product cost offset, reversal, print/export, and migration application.
