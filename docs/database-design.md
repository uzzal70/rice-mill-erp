# Database Design

## Status
Complete

## 1. Business workflow
- **Purpose and actors**:
  - The Rice Mill ERP database is a high-concurrency, multi-tenant, normalized PostgreSQL database designed to support 24/7 continuous operations across auto rice mills, parboiled mills, traditional mills, and fully integrated industrial complexes.
  - Primary actors interacting with the schema include Mill Owners, Managing Directors, Factory Managers, Weighbridge Operators, Gate In-charge, Quality Control Officers, Store In-charge, Miller Operators, Accountants, Sales Managers, and System Auditors.
- **Preconditions and source documents**:
  - Requires PostgreSQL 15+ with ACID compliance, connection pooling (via PgBouncer/Prisma connection management), and strict UTF-8 text encoding.
  - Data integrity is enforced at the database level with foreign keys, composite unique constraints, indexes on lookup paths, and transactional boundary isolation.
- **States and transitions**:
  - All operational domain entities (Gate Entries, Weighbridge Tickets, Quality Samples, Goods Receipts, Invoices, Production Batches, Dispatches, Sales Orders, Journals, Payrolls) enforce explicit lifecycle state enums: `PENDING`, `DRAFT`, `APPROVED`, `POSTED`, `COMPLETED`, `CANCELLED`, `REVERSED`.
- **Approval, posting, cancellation, correction/reversal**:
  - Posted records are immutable; modifications require audited reversal journals, credit/debit notes, or stock adjustments.
  - Soft-deletes and audit trails preserve historical evidence; hard deletes are prohibited on operational transaction tables.
- **Company/factory/location and ownership scope**:
  - Complete multi-tenant boundary: all operational tables carry mandatory `companyId` (and where applicable, `factoryId`) foreign keys.
  - Cross-tenant data leakage is structurally impossible through composite foreign keys and indexed compound tenant filters.

## 2. Database entities
The database schema encompasses 80+ normalized models grouped into 13 core domain clusters:

1. **Multi-Tenant & Security**:
   - `Company`: Root tenant entity with legal name, BIN/VAT, trade license, contact info, active status.
   - `Factory`: Operational production units belonging to a company with production type and business modes.
   - `User`: Global credentials, name, email, phone, status, MFA flags.
   - `Membership`: Company-user link with active status.
   - `Role` & `Permission` & `RolePermission`: Fine-grained Role-Based Access Control (RBAC).
   - `UserRole`: Assignment of users to roles within tenant context.
   - `AuthSession`, `AuthLoginEvent`, `AuthChallenge`: Session tracking, brute-force protection, audit logs.

2. **Master Catalog & Counterparties**:
   - `Partner`: Counterparties categorized by `PartnerType` (SUPPLIER, FARMER, BROKER, CUSTOMER, TRANSPORTER, CONTRACTOR).
   - `Item`: Products classified by `ItemClassification` (PADDY, RICE, BY_PRODUCT, PACKAGING, FUEL, SPARE_PART, CONSUMABLE).
   - `PackagingSpec`: Detailed bag configurations (weight, material, tare weight, brand).
   - `UnitConversion`: Configurable mill conversion factors (e.g., 1 MON = 40 KG, 1 TON = 1000 KG).
   - `MoisturePolicy`: Base moisture and deduction sliding scales per paddy variety.

3. **Storage & Warehousing Hierarchy**:
   - `Godown`: Storage warehouses scoped by factory with capacity and type.
   - `Stack`: Physical stacks within godowns with coordinate systems (Row/Bay/Tier), item type, and KG capacity.
   - `ProductionLine`: Dedicated processing lines within factories.

4. **Gate & Inbound Logistics**:
   - `Vehicle`: Fleet and third-party trucks with registration number, tare weight, capacity, fitness expiry.
   - `GateEntry`: Inbound/outbound gate logs capturing vehicle, driver mobile, entry type, time stamps, status.
   - `GateAttachment`: Digital documents (challans, weighment slips, inspection photos) attached to gate passes.

5. **Weighbridge & Quality Control**:
   - `WeighbridgeTicket`: Gross weight, tare weight, net weight, BSTI calibration ID, operator notes.
   - `QualitySample`: Grain moisture %, foreign matter %, broken grains %, discolored grains, chalky grains, deduction rates.

6. **Procurement & Inventory Engine**:
   - `PurchaseOrder`: Contracts and purchase orders with rate, total weight, bags, delivery schedule.
   - `GoodsReceipt`: Confirmed intake (GRN) reconciling gate, weighbridge, and quality inspection.
   - `PurchaseInvoice`: Financial vendor invoices with tax, deductions, and payment due dates.
   - `LandedCost` & `LandedCostComponentConfig`: Transport, loading, unloading, brokerage, and moisture loss capitalization.
   - `StockMovement`: Append-only immutable inventory ledger recording all IN, OUT, TRANSFER, ADJUSTMENT movements.
   - `StockTransfer`: Godown-to-godown and stack-to-stack transfer batches.
   - `StockAdjustment`: Audited inventory adjustments (shrinkage, drying loss, damage).
   - `StockCount`: Periodic physical inventory count snapshots and reconciliation.

7. **Production & Processing**:
   - `DryingBatch`: Sun-drying and mechanical dryer runs tracking moisture reduction from field to mill.
   - `ParboilingBatch` & `ParboilingStage`: Soaking, steaming, and drying stages with temperature and moisture logging.
   - `ProductionBatch`: Milling runs consuming paddy input and yielding head rice, broken rice, bran, and husk.
   - `ProductionOutput`: Granular yields per production run.
   - `RepackingBatch`: Bulk-to-retail conversion with packaging material consumption and mass balance validation.

8. **Toll & Commercial Milling**:
   - `TollOrder`: Third-party paddy processing agreements with agreed toll milling charge per KG/MON.
   - `TollBatch`: Milling execution against third-party paddy.
   - `TollDelivery`: Finished rice and by-product delivery back to client.

9. **Sales, Distribution & Returns**:
   - `SalesQuotation` & `SalesQuotationLine`: Pre-order price offers and terms.
   - `SalesOrder` & `SalesOrderLine`: Confirmed orders with delivery schedules and dealer credit checks.
   - `Dispatch` & `DispatchLine`: Outbound gate passes and delivery challans linked to sales orders.
   - `SalesReturn` & `SalesReturnLine`: Customer returns with quality checks, restocking, and credit note issuance.

10. **Financial Accounting & Double Entry**:
    - `Account`: Chart of accounts categorized by Asset, Liability, Equity, Revenue, Expense.
    - `Journal`: Balanced journal headers with source document references.
    - `JournalLine`: Atomic debit/credit entries with mandatory balanced sum ($\sum \text{Debit} = \sum \text{Credit}$).
    - `Expense` & `ExpenseLine`: Operational factory expenses with tax withholding.
    - `TaxConfig`: Bangladesh NBR tax rules (VAT, AIT, TDS, VDS) with effective date bounds.

11. **Human Resources & Payroll**:
    - `Employee`: Mill workers, technicians, operators, and staff with department, designation, salary.
    - `Attendance`: Daily biometric/manual check-in, check-out, overtime hours.
    - `Leave`: Vacation, sick, and casual leave records with supervisor approval.
    - `Payroll` & `PayrollLine`: Monthly salary slips with basic, allowances, overtime, deductions, and net pay.
    - `EmployeeLoan`: Advances and installment deductions.

12. **Plant Machinery & Fleet Maintenance**:
    - `Machine`: Mill machinery (Boilers, Dryers, Hullers, Polishers, Color Sorters) with specs and operating hours.
    - `MachineLog`: Running hours, power consumption, breakdowns.
    - `MachineMaintenance`: Preventative and corrective maintenance schedules and work orders.
    - `MachineSparePartUsage`: Inventory consumption for maintenance.
    - `VehicleTrip`: Fleet trip logs, odometer readings, and cargo weights.
    - `FuelLog`: Diesel/CNG consumption and mileage.
    - `VehicleMaintenance`: Vehicle repairs and fitness renewals.

13. **Governance, Auditing & Communication**:
    - `AuditEvent`: Comprehensive immutable audit trail capturing actor, IP, entity, action, before/after diffs.
    - `ApprovalRequest` & `ApprovalAction`: Multi-tier workflow approvals for purchase, pricing, and adjustments.
    - `CompanyDocument`: Document vault with expiry tracking for trade licenses, factory fitness, BSTI certificates.
    - `SmartAlert` & `AlertRule`: Automated diagnostic alert engine.
    - `AiModelRegistry`, `AiPredictionLog`, `AiFeatureDataset`: ML feature store and inference logs.
    - `AppNotification` & `NotificationChannelConfig`: In-app, Email, SMS, and WhatsApp alerts.

## 3. Relationships
- **Multi-Tenant Scoping**:
  - Every operational table references `Company(id)` via `companyId` with `onDelete: Cascade` or `onDelete: Restrict`.
  - Factory-level tables reference `Factory(id)` via `factoryId` with `onDelete: Restrict` to avoid accidental loss of operational history.
- **Referential Integrity**:
  - Stock movements reference `Item(id)` and `Stack(id)` with `onDelete: Restrict`. Deleting an item with active stock ledger movements is blocked by foreign key constraints.
  - Journal lines reference `Account(id)` and `Journal(id)` with `onDelete: Restrict`.
  - Dispatches reference `SalesOrder(id)` and `Vehicle(id)`.
  - Goods Receipts reference `PurchaseOrder(id)`, `GateEntry(id)`, and `WeighbridgeTicket(id)`.

## 4. Calculations
- **Database-Level vs Service-Level**:
  - Calculations are strictly executed in backend services and persisted into numeric columns.
  - Numeric columns use `Decimal(12, 2)` for financial values (currency amounts, rates) and `Decimal(12, 4)` for high-precision physical quantities (metric tons, moisture percentages, conversion factors).
  - Virtual computed aggregations (e.g., current stack balance) are derived from the immutable `StockMovement` ledger using `SUM(quantityKg)` grouped by item and stack.

## 5. Accounting impact
- Schema enforces balanced double-entry accounting:
  - `Journal` header holds `isBalanced` boolean.
  - `JournalLine` stores `debit` and `credit` as `Decimal(12, 2)`.
  - Check constraint / service transaction guarantees $\sum \text{Debit} - \sum \text{Credit} = 0$.
  - Chart of accounts supports standard 5-digit code hierarchy (10000 Assets, 20000 Liabilities, 30000 Equity, 40000 Revenue, 50000 Expenses).

## 6. Inventory impact
- Schema uses an append-only transaction ledger design (`StockMovement`):
  - Every inventory transaction records `companyId`, `factoryId`, `godownId`, `stackId`, `itemId`, `movementType`, `quantityKg`, `bagCount`, `unitCost`, `sourceType`, `sourceId`.
  - Real-time stock counts and reconciliations prevent drift between physical stock and book stock.
  - Stack capacity limits (`maxCapacityKg`) in `Stack` model enable capacity check constraints.

## 7. API
- Database access is managed exclusively through Prisma ORM with connection pooling.
- Raw SQL queries are restricted to complex analytical grouping queries and protected with parameterized queries to eliminate SQL injection vulnerabilities.
- Pagination is enforced on all list queries with `take` and `skip` limits (maximum 100 records per page).

## 8. Permissions
- All database queries are filtered by the authenticated user's `companyId` and permitted `factoryId` list extracted from JWT claims.
- Super Admin operations across tenants require explicit elevated credentials.
- Database connection strings are secured via environment variables and never checked into source control.

## 9. Validation
- **Unique Constraints**:
  - `Company`: `code`
  - `Factory`: `[companyId, code]`
  - `User`: `email`, `phone`
  - `Godown`: `[companyId, factoryId, code]`
  - `Stack`: `[godownId, code]`
  - `Item`: `[companyId, code]`
  - `Partner`: `[companyId, code]`
  - `PurchaseOrder`: `[companyId, orderNumber]`
  - `GoodsReceipt`: `[companyId, grnNumber]`
  - `WeighbridgeTicket`: `[companyId, ticketNumber]`
  - `GateEntry`: `[companyId, gateNumber]`
  - `SalesOrder`: `[companyId, orderNumber]`
  - `Dispatch`: `[companyId, dispatchNumber]`
  - `Journal`: `[companyId, journalNumber]`
- **Indexes**:
  - Compound indexes on all high-throughput queries: `[companyId, factoryId, createdAt]`, `[companyId, status]`, `[companyId, itemId, occurredAt]`.

## 10. UI
- Schema maps directly to the Material UI frontend components:
  - Master tables render in server-paginated `DataGrid` tables.
  - Transaction workflows use `Stepper` and `Wizard` forms matching normalized header-line tables.
  - Lookup relations (Item, Partner, Godown, Stack, Vehicle) render via debounced `Autocomplete` dropdowns.

## 11. Reports
- Normalized schema powers real-time reporting views:
  - Daily Mill Production Register (aggregating `ProductionBatch` and `ProductionOutput`).
  - Stock Movement Ledger (aggregating `StockMovement` grouped by Item, Godown, Stack).
  - General Ledger and Trial Balance (aggregating `JournalLine` grouped by `Account`).
  - Party Ledger (aggregating `JournalLine` and counterparties).

## 12. Tests
- Schema validation via Prisma CLI (`prisma validate`).
- Database design test suite `backend/src/modules/database-design.spec.ts`:
  - 100% of tables verify primary key definition.
  - Tenant scoping verified across all operational models.
  - Unique constraint uniqueness verified.
  - Referential integrity verified.

## 13. Known limitations & Next steps
- PostgreSQL table partitioning by year/month can be introduced for `StockMovement` and `AuditEvent` when transaction volumes exceed 10 million rows.
- Read replicas can be attached for analytical reports (`ReportsService`) to maintain sub-50ms latency on primary transactional operations.

