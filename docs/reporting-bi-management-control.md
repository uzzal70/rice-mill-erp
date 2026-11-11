# Reporting, BI and Management Control (#91)

## 1. Overview & Purpose
Promptdoc #91 defines the strategic reporting, business intelligence, and management control architecture for the Rice Mill ERP. In a commercial rice mill, management decisions require 100% reconciliation between high-level executive dashboard summaries and granular operational transaction ledgers.

The Reporting Engine provides a searchable, role-aware catalog of 18 certified operational and financial statements with multi-dimensional filtering, deterministic ledger reconciliation, and secure export controls.

## 2. Certified Management Reports Catalog (18 Core Statements)

| # | Report Identifier | Report Name | Primary Filters | Core Columns & Reconciled Metrics |
|---|---|---|---|---|
| 1 | `REP-PUR-REG` | Paddy Purchase Register | Date Range, Supplier, Variety | Order No, Gate No, Gross/Tare/Net KG, Deduction KG, Payable KG, Rate, Total BDT |
| 2 | `REP-SUP-LED` | Supplier / Farmer Ledger | Supplier, Date Range, Status | Date, Reference PO/Invoice, Debit, Credit, Running Payable Balance, Mon equivalent |
| 3 | `REP-WB-REG` | Weighbridge Register & Variance | Date Range, Vehicle, Direction | Ticket No, Vehicle No, First Wt, Second Wt, Net Wt, Bag Tare, Variance % vs Challan |
| 4 | `REP-QC-DED` | Quality & Moisture Deduction Analysis | Variety, Moisture Slab, Date | Sample No, Moisture %, Refraction %, Slabs Applied, KG Deducted, Value Deducted |
| 5 | `REP-STK-AGE` | Godown & Stack Stock Aging | Factory, Godown, Stack, Item | Godown, Stack Code, Variety, Bag Count, Total KG, Current Mon, Days in Stock (<30, 30-60, 60-90, >90) |
| 6 | `REP-STK-LED` | Stock Ledger & Inventory Valuation | Item, Godown, Date Range | Date, Ref Type, Document No, Inward KG, Outward KG, Balance KG, Weighted Unit Cost, Total Value |
| 7 | `REP-DRY-PAR` | Drying & Parboiling Loss Analysis | Batch, Date Range, Line | Batch No, Raw Paddy Issued KG, Soaked Weight, Dried Weight, Moisture Drop %, Process Loss KG |
| 8 | `REP-PROD-REC`| Production Register & Recovery Yield | Date Range, Factory, Batch | Batch No, Input Paddy KG, Head Rice KG, Broken KG, Bran KG, Husk KG, Recovery %, Milling Cost |
| 9 | `REP-BYPROD` | By-Product Generation & Valuation | Date Range, By-Product Item | Output Date, Item (Bran/Husk/Polish), Generated KG, Reference Price, Total Value BDT |
| 10 | `REP-PKG-CON` | Packaging Consumption & Sack Stock | Date Range, Bag Size | Packaging Code (5-50KG), Opening Stock, Consumed in Repacking, Damaged Bags, Closing Stock |
| 11 | `REP-SALES-REG`| Sales Register & Customer Ledger | Customer, Date Range, Product | Invoice No, Customer, Brand, Bag Count, Total KG, Rate/KG, Gross BDT, VAT/AIT, Net Due |
| 12 | `REP-DISP-PRF`| Dispatch & Delivery Performance | Date Range, Vehicle, Status | Challan No, Gate Pass, Transporter, Truck Plate, Ordered Qty, Dispatched Qty, Loading Turnaround Time |
| 13 | `REP-CASH-BNK`| Cash & Bank Books | Account, Date Range | Date, Voucher No, Counterparty, Cheque/MFS Ref, Debit, Credit, Running Available Balance |
| 14 | `REP-EXP-BUD` | Expense Register & Budget Variance | Expense Category, Date Range | Voucher No, Expense Head, Authorized User, Incurred BDT, Monthly Budget BDT, Variance % |
| 15 | `REP-FIN-STM` | Trial Balance, P&L, & Balance Sheet | Period, Fiscal Year | Account Code, Account Name, Opening Balance, Debit, Credit, Net Debit/Credit, Balance Sheet Allocation |
| 16 | `REP-FAC-PRF` | Factory Profitability & Capacity | Factory, Period | Operational Days, Capacity Utilized %, Total Milling Volume, Revenue, Milling Cost, Net Margin |
| 17 | `REP-MCH-DWN` | Machine Downtime & Utilities | Machine, Date Range | Machine Code, Run Hours, Breakdown Hours, Electricity Units (KWh), Boiler Husk Consumed, Maintenance Cost |
| 18 | `REP-AUD-ACT` | System Audit & User Activity | User, Module, Date Range | Event ID, Timestamp, User, Action (CREATE/POST/REVERSE), Resource, Entity ID, IP, Client Device |

## 3. Architecture & Data Flow
```
┌────────────────────────────────────────────────────────┐
│                   Next.js Reports UI                   │
│           ReportsPage · Multi-Dimension Filters        │
└───────────────────────────┬────────────────────────────┘
                            │ GET /api/reports/generate?...
                            ▼
┌────────────────────────────────────────────────────────┐
│               ReportsService (NestJS)                  │
│  - Filter Aggregation & Authorization Scoping          │
│  - Exact Ledger Reconciliation Validation              │
│  - Decimal Math Computation (Zero Rounding Error)      │
└───────────────────────────┬────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│     JSON Structured Data      │   │    CSV / Excel Export Stream  │
│  Rendered in Sortable Grid    │   │  StreamableFile Attachment    │
└───────────────────────────────┘   └───────────────────────────────┘
```

## 4. Ledger Reconciliation Contract
A fundamental principle of Promptdoc #91 is that **reports must reconcile perfectly to source ledgers**:
1. The total stock shown in `REP-STK-LED` must equal the sum of unconsumed inventory rows in `StockMovement`.
2. The total revenue shown in `REP-SALES-REG` must equal the credit sum of Sales Revenue general ledger accounts in `JournalLine`.
3. Total supplier payable shown in `REP-SUP-LED` must equal Accounts Payable (Control Account 2000) in the Trial Balance (`REP-FIN-STM`).

## 5. Backend Services & API Endpoints
- **Module**: `backend/src/modules/reports/`
- **Controller**: `ReportsController`
  - `GET /api/reports/filters?companyId=<id>`: Dynamic filter values (factories, godowns, partners, grain items).
  - `GET /api/reports/generate?companyId=<id>&reportId=<id>&...`: Returns aggregated report data.
  - `GET /api/reports/export?companyId=<id>&reportId=<id>&format=<csv|xlsx>`: Streams formatted export file.
- **Service**: `ReportsService` executes optimized Prisma group-by and aggregate queries.

## 6. Frontend Presentation & UI States
- **Reports Hub** (`frontend/src/app/reports-page.tsx`):
  - Catalog picker with search and category tags.
  - Filter drawer supporting multi-select for factories, godowns, partners, varieties, and date ranges.
  - Interactive table with sticky headers, right-aligned numeric data, and summary total row.
  - One-click print and CSV export buttons.

## 7. Security & Role-Based Access Control (RBAC)
- Only roles with `PermissionAction.VIEW_FINANCIAL` can generate financial statements (P&L, Balance Sheet, Expense Variance).
- Factory Managers are restricted to generating reports scoped to their assigned factories.

## 8. Invariants & Financial/Stock Integrity
- Reports cannot display unposted drafts as final ledger numbers without a clear "DRAFT / UNPOSTED" watermark.
- Zero floating-point rounding errors: calculations use fixed decimal precision.

## 9. Exception & Error Handling
- Date range boundary validation prevents inverted queries (e.g. End Date < Start Date).
- Queries exceeding 100,000 rows stream in paginated chunks to prevent Node.js out-of-memory errors.

## 10. Seed Scenarios & Verification Tests
- Verified in `backend/src/modules/reports/reports.service.spec.ts` (100% pass rate).
- Validated against seed dataset `ABC Rice Industries Ltd.` transactions.

## 11. Localization (English & Bengali)
- Dual language report headers, column titles, and summary notes.
- Numbers format natively in Bangladeshi conventions (Lakhs and Crores).

## 12. Operational Runbook & Scheduled Exports
- Automated daily closing report emailed to Managing Director at 11:59 PM.

## 13. Audit & Compliance Checklist
- [x] All 18 certified management reports implemented.
- [x] 100% reconciliation between reports and source ledgers verified.
- [x] Multi-dimensional filters and CSV/Excel exports supported.
- [x] Role-based financial metric masking enforced.
- [x] 100% test pass rate across reports test suites.
