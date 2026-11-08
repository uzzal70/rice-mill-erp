# Production Cost

## Status
Designed; implementation not started. Production costing must remain partial until inventory carries a reliable issue cost for each batch input.

## 1. Business workflow
- A production batch can have a draft cost sheet, approval and posting after batch approval. Cost posting must be idempotent and tied to the immutable production batch.
- Cost sheet records source-backed paddy input cost plus actual production component amounts for electricity, diesel, gas, steam, labour, machine maintenance, packaging, transport, factory overhead and other direct cost.
- A correction must reverse the cost posting and post a replacement; posted costs cannot be edited.
- Cost policy is company/factory configured and snapshotted on each batch so later policy changes do not rewrite history.

## 2. Database entities
- `ProductionCostSheet`: one per production batch, selected method, source paddy issue quantity/cost, component lines, total, per-input-KG/Mon/Ton rates, state, actors, and timestamps.
- `ProductionCostComponent`: named amount and evidence/source reference for each direct cost line.
- Method enum: `ACTUAL`, `WEIGHTED_AVERAGE`, `FIFO`, `STANDARD`.
- Migration pending.

## 3. Relationships
- Cost sheet references a posted/approved batch and same company/factory. Paddy issue valuation is sourced from inventory movement valuation layers; component sources are retained for audit.
- Output cost allocation and by-product credits belong to #33 and must reconcile to this total.

## 4. Calculations
- Gross batch cost = valued paddy input consumption + sum of eligible direct cost components.
- Cost per input KG = gross batch cost / batch input KG. Per Mon and Ton use the effective company unit conversion graph. Monetary rounding is two decimal places; unit costs four decimal places.
- `ACTUAL` uses actual documented component amounts. `WEIGHTED_AVERAGE` uses the moving average of valued inventory available at issue time. `FIFO` consumes dated receipt/transfer layers in order. `STANDARD` uses a maintained effective-dated standard cost.
- Missing source cost, unit conversion, selected method policy, or component source must fail explicitly.

## 5. Accounting impact
- The production issue and output should ultimately debit work-in-process/finished inventory and credit paddy inventory; component accounts follow configured mappings. Posting requires double-entry journals and reversal support.
- No accounting entries should be posted until chart-of-account mappings and source valuation are available.

## 6. Inventory impact
- Cost posting does not create a second quantity movement. It values the parent batch's existing material issue and outputs; #33 handles by-product output credits and finished-rice allocation.
- Current `StockMovement.unitCost` is only populated for GRN receipt. Transfer, production input, parboiling and drying movements lack cost layers. Landed cost is a separate analysis record and does not update GRN valuation. Therefore FIFO and weighted-average results cannot currently be derived safely.

## 7. API
- Planned factory/company costing-policy read/update, batch cost-sheet calculate/read, approve and post routes.
- The calculation response must expose component evidence, method snapshot, batch total and per-unit rates.

## 8. Permissions
- Production cost reads and edits require production permissions plus `VIEW_FINANCIAL`; approval/post require `production:APPROVE/POST` and financial view.

## 9. Validation
- Posted batch and inventory issue quantity must reconcile; costs cannot be negative; all source records must match company/factory and the configured effective date.
- A method must be explicitly configured; no implicit default method.

## 10. UI
- Planned bilingual cost sheet with method snapshot, source-backed input cost, configurable actual components, calculated totals/rates, approval/post actions, and reconciliation errors.

## 11. Reports
- Batch production cost register by factory/date/method, with component detail and input-unit cost. Export/print and reconciliation to finished inventory and GL are required.

## 12. Tests
- Required: decimal calculations, each costing method, layer consumption, missing valuation/configuration, company/factory boundaries, permissions, concurrency/idempotency, journal balance, reversal and batch/output reconciliation.

## 13. Implementation and verification
- Existing code captures some drying/parboiling resource observations and purchase/packaging reference values, but no production cost sheet or inventory cost-layer engine exists.
- Remaining: cost policy/schema/API/UI, movement valuation layers, landed-cost integration, double-entry mappings, tests and report reconciliation.
