# Completed Tasks Log

This file records the implementation work completed in the project so far.

## Date
2026-11-02

## Completed items

- [x] Factory master configuration implemented for:
  - factory name/code
  - production type
  - business modes
  - address/manager/capacity fields
  - active/inactive status

- [x] Factory production-line support added to the schema and service layer.
  - ProductionLine model has factory/company scoping and active status support.
  - ProductionBatch can now reference an optional `productionLineId`.
  - Validation ensures the selected line belongs to the active factory/company.

- [x] Production batch creation updated to support line assignment.
  - `productionLineId` accepted in create DTO.
  - Batch creation validates line membership before saving.
  - Batch reads include production-line metadata.

- [x] Migration added for production-line linkage.
  - `0013_production_line_reference`

- [x] Production batch service tests expanded for the new line-aware flow.
  - Confirms an active line is accepted and stored.

- [x] Backend validation and build checks completed successfully.
  - Production service test suite passed.
  - NestJS build passed.

- [x] Frontend validation completed successfully.
  - `npm run typecheck` passed for the Next.js app.

- [x] Existing project architecture and work boundaries reviewed against the phase docs.
  - Production-line assignment was identified as one of the remaining gaps from the project documentation.

- [x] #15 By-product Master implemented.
  - Added by-product type classification and migration `0014_by_product_type`.
  - Added audited creation with required purchase and sales reference prices behind combined create/financial permissions.
  - Added a bilingual catalog with active filtering, protected price editing, and ledger-derived factory activity.
  - Added tests for price/type validation and stock, production, dispatch, and return movement calculations.
- [x] #16 Packaging Master implemented.
  - Added a protected packaging creation API, supplier validation, editable packaging specifications, and audited unit-cost management.
  - Added factory-scoped packaging balances derived from inventory ledger movements and a bilingual catalog integrated into the app navigation.
  - Seed data includes 5, 10, 20, 25, and 50 KG example bags; custom sizes remain unrestricted.
  - Added tests covering packaging creation, supplier/company validation, metadata updates, financial cost access, and stock scope.
  - Validation passed: 17 backend suites / 106 tests, backend build, frontend typecheck and production build, Prisma schema validation, and seed syntax check.

## In progress

- [ ] #25 Landed Cost.
  - Added migration `0020_landed_cost`, lifecycle fields, configurable company/factory cost components, receipt-level purchase and direct-cost calculation, unit-converted per-KG/Mon/Ton rates, audited draft/approve/post APIs, and a bilingual landed-cost desk.
  - Linked landed-cost state into the GRN list and updated the module design note. Stock valuation and accounting remain explicitly unchanged.
  - Backend build and frontend typecheck pass. Prisma Client generation validates the schema; migration application and automated tests remain pending. See [landed-cost.md](./landed-cost.md).

- [ ] #26 Inventory Engine.
  - Added item classifications for fuel, spare parts, and consumables plus movement types from the master prompt in migration `0021_inventory_item_types`.
  - Broadened transfer and adjustment APIs to all active item kinds. Stack occupancy and positive movement capacity checks convert to KG using the company's effective conversion graph.
  - Backend build passes; migration application and automated tests remain pending. Source workflows for opening stock, sales/returns, repacking, damage/loss, and movement UI remain. See [inventory-engine.md](./inventory-engine.md).

- [ ] #27 Stock Ledger.
  - Added migration `0022_stock_counts`, stock count snapshots, stale-count checks, and atomic reconciliation movements.
  - Stock balances now report opening, in, out, and balance with warehouse and lot metadata; the bilingual inventory desk records and posts counts.
  - Prisma Client generation, backend build, and frontend typecheck pass. Migration application and automated tests remain pending. See [stock-ledger.md](./stock-ledger.md).

- [ ] #28 Drying Module.
  - Added a bilingual drying-batch desk for actual weights, before/after moisture, method, duration, resource observations, and workflow actions.
  - Existing backend stores actual loss and posts input/output paddy atomically. Frontend typecheck passes; resource costing, reversal, export, migration application and automated tests remain. See [drying.md](./drying.md).

- [ ] #29 Parboiling Module.
  - Added a bilingual parboiling workflow form for batch data and ordered soaking, steaming, and drying stage measurements, with approve/post actions.
  - Existing backend validates stage timing and weight reconciliation and posts raw/parboiled stock atomically. Frontend typecheck passes; costing, reversal, milling handoff, export, migration application and automated tests remain. See [parboiling.md](./parboiling.md).

- [ ] #30 Production Module.
  - Added bilingual milling batch desk for paddy input, optional production line, multiple rice/by-product output rows, approval and stock posting.
  - Existing service validates output mass balance and posts input/output movements. Machine registry, costing, reversal, export, migration application and automated tests remain. See [production.md](./production.md).

- [ ] #31 Recovery Calculation.
  - Production desk now displays server-calculated head-rice, total-rice, by-product recovery, process loss, and below-standard warning.
  - Uses paddy item's standard recovery snapshot; separate threshold configuration/export remain. Frontend typecheck passes; automated tests were not run. See [recovery-calculation.md](./recovery-calculation.md).

- [ ] #32 Production Cost.
  - Added [production-cost.md](./production-cost.md) specifying cost components, costing methods, source evidence, permissions, accounting impact, and release gates.
  - Implementation is not started: current stock movements lack complete cost layers and landed-cost calculations do not change inventory valuation, so FIFO/weighted-average or production posting would be unsupported.

- [ ] #33 By-product Cost Offset.
  - Added [by-product-cost-offset.md](./by-product-cost-offset.md) defining source-backed realized-revenue offsets, return handling, reconciliation, and dependencies.
  - Implementation awaits #32 cost valuation and #35/#38 posted sales/return lines with inventory batch lineage. Reference prices are excluded from actual revenue.

- [ ] #34 Repacking.
  - Added `RepackingBatch`, migration `0023_repacking_batches`, and company/factory-scoped create/approve/post endpoints.
  - Posting validates KG mass balance, source stock, factory packaging-piece stock, and output stack capacity, then atomically writes source rice, finished rice, and packaging movements.
  - Added a bilingual repacking desk with calculated packed quantity/loss and approval/post actions. Migration deployment, costing/accounting, reversal, date filters, and export/print remain. Prisma generation and builds/typecheck are pending; automated tests were not run. See [repacking.md](./repacking.md).

- [ ] #35 Sales.
  - Added migration `0024_sales_orders`, draft order API with transaction-price snapshots, approval-time serializable stock reservations, reservation release on cancellation, and a bilingual desk.
  - Updated the bilingual form to create multiple item/stack lines with transaction rates. Quotations, credit controls, dispatch, invoice/payment flows, accounting, migration deployment, and tests remain. See [sales.md](./sales.md).

- [ ] #36 Customer Management.
  - Extended the bilingual partner master with CUSTOMER listing, creation, editing, and protected financial defaults using existing customer-capable Partner fields; no schema migration was required.
  - Customer purchase-ledger access remains blocked by type validation. Invoice, payment, advance, due, return, credit-note, and debit-note activity awaits the sales/dispatch/returns ledgers. See [customer-management.md](./customer-management.md).

- [ ] #17 Supplier/Farmer Management.
  - Implemented the bilingual profile register and protected financial-default editor using the existing company-scoped partner APIs.
  - Added explicit nullable updates for optional email, bank, credit-limit, and payment-term fields, with financial audit logging.
  - Added a financial-permission-protected, company-scoped ledger of posted goods receipts with physical received KG and gross purchase value allocated from the purchase order's payable KG and adjusted rate. Payment, advance, due, returns, additional deductions, commissions, and transport totals still await their source workflows.
  - Added controller-level authorization metadata tests for financial ledger/read/update routes and verified company-scoped ledger delegation.
  - Payment, advance, due, returns, deductions, commissions, and transport totals remain outstanding until their source workflows are implemented; these balances are not fabricated.
  - Added tests for empty posted-purchase history and ledger pagination validation; the opening balance remains distinct from posted purchase totals.
  - Validation: all 18 backend suites / 118 tests, backend build, frontend typecheck, and production build pass.

- [x] #18 Broker Management.
  - Added atomic broker creation with required commission basis and positive rate, protected reads/updates, status controls, and audit logging.
  - Supported bases: per KG, per Mon, per Ton, percentage (maximum 100%), and fixed amount.
  - Generic partner creation is blocked for brokers so every new broker has commission terms at creation; broker creation requires partner-create and financial-view permissions.
  - Purchase-order creation snapshots broker terms and calculates commission using the company unit-conversion graph or the configured purchase value; missing required conversions are rejected.
  - Added optional broker selection to procurement and displays the calculated commission amount. Accounting accrual/payment remain for later phases.
  - Validation passed: 19 backend suites / 128 tests, backend build, Prisma schema validation, seed syntax check, frontend typecheck, and production build.

- [x] #19 Gate Management.
  - Added complete inward/outward entry capture for vehicle, driver, supplier/customer, material, purpose, date/time, challan, reference, and remarks, with factory scoping and gate-number uniqueness.
  - Added audited PDF/JPEG/PNG/WebP attachments with content-signature checks, a 10 MB limit, generated storage keys, private local file persistence, and authenticated scoped downloads.
  - Extended gate lists with transaction context and attachment metadata; the gate desk supports upload and download.
  - Added migration `0016_gate_attachments` and documented the required persistent `GATE_ATTACHMENT_DIR` deployment volume.
  - Validation passed: 19 backend suites / 130 tests, backend build, Prisma schema validation, seed syntax check, frontend typecheck, and production build. Database migration application requires a configured PostgreSQL database.

- [x] #20 Vehicle Management.
  - Added a bilingual company vehicle register for registration, type, owner, driver/mobile, fitness, insurance, and tax-token expiry dates, with status filters and expiry warnings.
  - Added company-scoped audited edit/deactivation APIs and a read-only gate movement history including linked-vehicle and unregistered same-plate visits, scoped to the selected factory.
  - Added migration `0017_vehicle_movement_index` and [vehicle-management.md](./vehicle-management.md).
  - Validation passed: 19 backend suites / 132 tests, backend build, Prisma schema validation, seed syntax check, frontend typecheck, and production build. Migrations require a configured PostgreSQL database to apply.

- [x] #21 Weighbridge.
  - Existing workflow records immutable manual tickets, calculates decimal-safe net weight, enforces timestamps and records operators.
  - Manual weighing is complete and verified through the gate workflow. Documented a clear boundary for future device integration: device identity, authenticated readings, idempotency, calibration/health, and immutable audit must be selected before any digital source is enabled; no unsupported vendor protocol is fabricated.
  - Validation passed with the gate and vehicle work: 19 backend suites / 132 tests, backend build, Prisma schema validation, seed syntax check, frontend typecheck, and production build.

- [x] #22 Quality Control.
  - Added a bilingual laboratory desk to record all required incoming-paddy parameters (moisture, foreign matter, broken, damaged, discolored, immature, chalky, purity, and other), comments, and explicit accept/reject decisions.
  - Expanded the gate desk result form to the same complete measurement set and made lab list results return only company-scoped gate context.
  - Fixed multi-sample gate workflow: any rejection rejects the gate; acceptance advances to receiving only after all gate samples are decided. Gate-row locking serializes decisions; approved/rejected results remain immutable and audited.
  - Added DTO range tests, measurement coverage, one-time submission, audit, rejection, approval-lock, and multi-sample workflow tests. Added [quality-control.md](./quality-control.md).
  - Quality approval itself does not directly change purchase rate or quantity. An accepted moisture result is consumed at purchase creation by the configured #23 policy engine; other quality penalties are not inferred.
  - Validation passed: 20 backend suites / 137 tests, backend build, Prisma schema validation, seed syntax check, frontend typecheck, and production build. No migration was needed because measurements were already stored as JSON.

- [x] #23 Moisture Calculation Engine.
  - Added company-scoped, auditable moisture policies with factory, paddy-variety, and supplier/farmer scopes; policies use administrator-managed numeric priority, and equal highest matches fail instead of selecting arbitrarily.
  - Implemented both configurable dry-matter and slab-percentage quantity formulas, allowed-moisture tolerance, independent rate reduction, decimal rounding, sample selection, and explicit missing-policy errors.
  - Purchase orders snapshot physical and payable KG separately, the accepted sample and policy inputs/results, agreed and adjusted rates. Physical GRNs/stock remain unchanged; inventory unit cost and posted supplier gross value reflect the payable amount. Broker commission remains on physical KG/original-rate basis.
  - Added a bilingual policy editor, protected policy APIs, seed permissions, documentation, and migration `0018_moisture_policies`, which backfills existing POs without adjustment. The database migration was not applied because no PostgreSQL connection was available.
  - Validation passed: 23 backend suites / 148 tests, backend build, Prisma schema validation, seed syntax check, frontend typecheck, and production build. Migration application requires a configured PostgreSQL database and remains pending.

## Notes

- The project remains a staged ERP implementation; work is considered partial until the remaining phase domains and accounting/sales workflows are completed.
- This log should be updated as new tasks are completed and as partial work is finished.

working #35 number
Read and follw the 'promtdoc' files, then start the work serial one bye one  #35, #36, 37, ....