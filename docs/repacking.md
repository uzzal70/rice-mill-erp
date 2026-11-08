# Repacking

## Status
Partially implemented; migration `0023_repacking_batches` is pending deployment.

## 1. Business workflow
- Operator creates a draft repack batch with source rice, output rice, packaging item, input quantity, package count, and locations. A supervisor approves and an authorized user posts.
- Draft → approved → posted. Posted records are immutable; corrections require a future reversal flow.
- Source and output may use the same rice item (package form is documented by the batch) or separate bulk/finished rice items.

## 2. Database entities
- `RepackingBatch` snapshots input, output, packing loss, packaging item/size/count, source/destination stack, status, actors and timestamps.
- Unique batch number per company; migration pending.

## 3. Relationships
- Rice items and packaging item belong to the same company; stacks belong to the selected factory. Packaging size is snapshotted from the selected active `PackagingSpec`.

## 4. Calculations
- Finished KG = package count × packaging specification size KG.
- Packing loss KG = source input KG − finished KG. Finished KG must be positive and cannot exceed input. No unconfigured tolerance is assumed.
- Package count must be a positive integer; partial bags are not permitted.

## 5. Accounting impact
- No journal/cost recalculation yet. Cost allocation awaits #32 and by-product cost offset awaits #33.

## 6. Inventory impact
- Posting atomically issues source rice input, receives finished rice output, and consumes packaging pieces. Packing loss is recorded on the batch and is included in source input not returned as finished rice; it is not subtracted twice.
- Rice output must fit destination stack capacity and item/packaging stock cannot go negative.
- Packaging stock is a factory-level balance in PIECE for this workflow because stack capacities are KG and no empty-bag physical weight is defined. Its movement uses a null stack location; this matches the existing factory packaging-stock register. A future packaging warehouse workflow can add physical package locations with a measured storage conversion.

## 7. API
- `GET/POST /repacking/batches`, `POST /repacking/batches/:id/approve`, and `POST /repacking/batches/:id/post` are implemented.

## 8. Permissions
- `repacking:READ/CREATE/APPROVE/POST`, company/factory scoped.

## 9. Validation
- Active rice source/output in KG, active packaging item with positive size specification, positive integer bag count, valid active stacks, sufficient source/packaging stock, unique batch number, and destination capacity.

## 10. UI
- Bilingual desk with source/output product, stack, packaging type/size, input KG, bag count, calculated packed KG/loss, and approval/post actions is implemented and connected to navigation.

## 11. Reports
- Repacking register with source/output quantities, package count/size, loss, packaging consumption, status, factory and date filters. Export/print remains.

## 12. Tests
- Required: bag arithmetic/precision, mass balance/loss, negative stock, packaging stock, capacity, permissions, tenant boundaries, duplicate/concurrent posting and immutable status.

## 13. Implementation and verification
- Backend and UI are implemented. Prisma Client generation and backend build/frontend typecheck are used as implementation checks; no automated tests were run. Migration deployment, accounting/cost allocation, reversal/correction, date filters, and export/print remain outstanding.
