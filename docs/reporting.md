# 55. REPORTING

## Status
Complete

## 1. Business workflow
- **Purpose and actors**: Provides unified multi-dimensional reporting, transactional audit registers, and high-definition printable statement generation across commercial, inventory, and financial operations. Actors: Managing Directors, Plant Heads, Commercial Managers, Chief Financial Officers, Internal/External Auditors, Tax Accountants.
- **Preconditions and source documents**: Compiles verifiable operational records across Procurement, Gate & Weighbridge, Milling Production, Sales Orders, Godowns & Stacks, Expense Vouchers, and General Ledger Journals.
- **Universal Multi-Filter Standard**: Every single report supports all 10 filter criteria:
  1. Date Range (`startDate`, `endDate`)
  2. Factory (`factoryId`)
  3. Godown / Silo (`godownId`)
  4. Supplier / Farmer (`supplierId`)
  5. Customer (`customerId`)
  6. Paddy Item (`paddyItemId`)
  7. Rice Item (`riceItemId`)
  8. Product / By-Product (`productItemId`)
  9. Batch Number (`batchNumber`)
  10. User / Creator (`userId`)
- **Export & Print Capabilities**:
  - PDF: Formatted high-definition print sheet with official header, filter summary, totals, and signatures (`window.print()` and PDF printer).
  - Excel: Native spreadsheet formatted CSV/XML.
  - CSV: RFC 4180 compliant export with column headers and records.
  - Clean printable view with print stylesheet, page break optimization, and triple-signatory verification (Prepared By, Checked By, Authorized Signatory).
- **Company/factory/location and ownership scope**: Multi-tenant isolation by `companyId` with optional scoping to specific factories via `factoryId`.

## 2. Database entities
- Queries existing core entities:
  - `PurchaseOrder`
  - `GateEntry` & `WeighbridgeTicket`
  - `ProductionBatch` & `ProductionOutput`
  - `SalesOrder` & `SalesOrderLine`
  - `StockMovement`, `Stack`, `Godown`
  - `Expense`
  - `Journal` & `JournalLine`
  - `Partner`
  - `Item`
  - `User`
- Migration: Built upon existing normalized schema; no duplicate reporting tables required.

## 3. Relationships
- Aggregates cross-functional operational records across Procurement (#17), Gate & Weighbridge (#19, #21), Production (#26), Sales (#27), Inventory (#23), Expense (#39), and Accounting (#40).

## 4. Calculations
- **Summary Totals**:
  - `totalRecords`: count of rows matching 10-dimensional criteria.
  - `totalQuantityKg`: $\sum \text{quantityKg}$.
  - `totalAmountBDT`: $\sum \text{lineAmount}$ or $\sum \text{totalAmount}$.
- **Net Weight**: $\text{Gross Weight} - \text{Tare Weight}$.
- **Recovery Ratio**: $\frac{\text{Rice Output KG}}{\text{Paddy Input KG}} \times 100$.
- **Financial Balance**: $\sum \text{Debit} - \sum \text{Credit}$.

## 5. Accounting impact
- Read-only transactional registers drawing directly from double-entry journal lines, AR/AP ledgers, and cash/bank books. Does not mutate or auto-post journal entries.

## 6. Inventory impact
- Groups physical FIFO movement batches to calculate current on-hand quantities across godowns and stacks without modifying physical stock balances.

## 7. API
- `GET /reports/filters?companyId=<id>`: Retrieves available dropdown options for factories, godowns, suppliers, customers, paddy varieties, rice products, and users.
- `GET /reports/generate`: Generates report data matching 10 filter criteria with headers, rows, and summary totals.
- `GET /reports/export`: Streams CSV or Excel files with `Content-Disposition` download headers.

## 8. Permissions
- `reports:READ`: Generate and export reports. Strictly scoped to authenticated company boundary.

## 9. Validation
- `GenerateReportDto`: Validates `companyId`, `reportType`, optional dates (`isDateString`), and UUID/cuid string lengths for all 10 filter dimensions.

## 10. UI
- `frontend/src/app/reports-page.tsx`:
  - 8 Report Type options (Procurement Register, Gate Register, Production Register, Sales Register, Stock Register, Expense Register, Financial Ledger, Party Statement).
  - 10-Filter Control Drawer/Bar with Date Pickers, Factory, Godown, Supplier, Customer, Paddy, Rice, Product, Batch, and User selectors.
  - Summary KPI cards for Filtered Records, Total Quantity KG, and Total Value BDT.
  - Export buttons: Print / PDF, Excel, CSV, and Reset Filters.
  - Print-Ready Layout (`@media print` optimized CSS, company branding, filter criteria banner, borders, alternating rows, summary totals, and 3 signature blocks).
  - Bilingual English/Bengali interface.

## 11. Reports
- Serves as the central reporting and statement generation hub for the entire enterprise.

## 12. Tests
- `backend/src/modules/reports/reports.service.spec.ts`: Unit tests validating filter options retrieval, multi-filter query matching, CSV export formatting, and stock balance calculations.
- `backend/src/modules/reports/reports.controller.spec.ts`: Controller delegation and CSV file download tests.
- 100% test pass rate across 7 unit tests.

## 13. Audit & Compliance
- System access and report export events recorded under standard audit logging.

