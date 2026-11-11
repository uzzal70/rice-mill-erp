# 59. EXCEL IMPORT

## Status
Complete

## 1. Business workflow
- **Purpose and actors**: Provides enterprise bulk onboarding and data migration capabilities across spreadsheets (Excel, CSV) with two-phase pre-import validation and live in-grid error correction. Actors: IT Administrators, System Implementation Consultants, Plant Accounts Managers, HR Officers, Storekeepers.
- **Preconditions and source documents**: Excel or CSV spreadsheets containing master profiles or initialization cutover balances exported from legacy ERPs or paper ledgers.
- **7 Supported Core Import Domains**:
  1. **Suppliers**: Aratdars, paddy grain suppliers, commission brokers (`code`, `name`, `phone`, `address`, `contactPerson`).
  2. **Customers**: Wholesale rice distributors, institutional buyers (`code`, `name`, `phone`, `address`, `creditLimit`).
  3. **Paddy (Paddy Master)**: Raw grain varieties and botanical specifications (`code`, `name`, `variety`, `baseUnit`).
  4. **Rice (Rice Master)**: Finished milled rice products and branded bag specifications (`code`, `name`, `variety`, `baseUnit`).
  5. **Opening Stock**: Initial warehouse cutover inventories (`itemCode`, `godownName`, `stackCode`, `quantityKg`, `unitCost`).
  6. **Opening Balance**: Initial debtor, creditor, and nominal ledger balances (`partyOrAccountCode`, `title`, `debitAmount`, `creditAmount`, `asOfDate`).
  7. **Employees**: Factory staff, mill technicians, shift foremen, and administrative employees (`employeeCode`, `fullName`, `department`, `designation`, `baseSalary`, `phone`).
- **Two-Phase Pre-Import Architecture**:
  - **Phase 1: Parse & Automated Validation**: Inspects every row against mandatory field rules, non-negativity checks, duplicate key collisions (within file and against live database), and data type constraints.
  - **Summary Metrics**: Segregates records into Valid Records, Invalid Records, and Specific Field-Level Errors.
  - **Inline Pre-Import Correction**: User can edit any invalid cell directly inside the interactive preview table. The grid automatically re-validates the dataset in real time without requiring the user to re-upload the spreadsheet.
  - **Phase 2: Atomic Audited Commit**: Inserts all verified records within an atomic database transaction (`prisma.$transaction`) and generates immutable audit log records.

## 2. Database entities
- Directly populates and verifies normalized ERP tables:
  - `Partner` (Supplier, Customer)
  - `Item` (Paddy, Rice)
  - `Employee`
  - `StockMovement` & `Stack` (Opening physical balances)
  - `Journal` & `Account` (Opening financial balances)
  - `AuditEvent`
- Normalized architecture ensures zero schema duplication.

## 3. Relationships
- **Multi-Tenant Isolation**: Records are explicitly stamped with `companyId` (and `factoryId` where applicable).
- **Referential Integrity**: Opening balances and stock lines validate that target commodity codes exist or are generated within the transaction.

## 4. Calculations
- **Validation Counts**:
  $$\text{Total Records} = \text{Valid Records} + \text{Invalid Records}$$
  $$\text{Total Errors} = \sum_{r \in \text{Records}} \text{count}(r.\text{errors})$$
- **Duplicate Collision Detection**: Enforces $O(1)$ set-based uniqueness verification across case-insensitive primary codes.

## 5. Accounting impact
- During Opening Balance import, posts opening cutover journals to the General Ledger, populating opening Trade Receivables, Trade Payables, and Retained Earnings accounts.

## 6. Inventory impact
- During Opening Stock import, seeds baseline physical quantities across godowns and stacks without fabricating artificial purchase transactions.

## 7. API
- `GET /import/templates`: Lists metadata, column schemas, data types, and examples for all 7 entity types.
- `GET /import/template/:entityType`: Streams a ready-to-use CSV template file with official column headers and sample rows.
- `POST /import/validate`: Accepts raw spreadsheet rows and returns structured validation status (`validRecords`, `invalidRecords`, `errors`).
- `POST /import/commit`: Atomically persists validated records to database with full audit logging.

## 8. Permissions
- `settings:READ`: Access import templates and run validation simulations.
- `settings:UPDATE`: Execute final database commit of master records.

## 9. Validation
- `ValidateImportDto` & `CommitImportDto`:
  - Enforces `companyId`, `entityType` enum, and non-empty records payload.
  - Enforces non-empty primary codes and names.
  - Enforces positive quantities for opening stocks and non-negative values for basic salaries.

## 10. UI
- `frontend/src/app/excel-import-page.tsx`:
  - 7 entity selection cards.
  - Sample template download buttons (CSV/Excel).
  - "Load Sample Data (with Errors)" simulation button for immediate testing.
  - Validation Summary cards (Total, Valid, Invalid, Errors).
  - In-place editable grid with red border highlights on invalid cells.
  - "Commit Valid Records" button with progress indicators and bilingual English/Bengali UI.

## 11. Reports / Outputs
- Generates downloadable CSV templates and detailed validation error reports with row and column citations.

## 12. Tests
- `backend/src/modules/import/import.service.spec.ts`: Unit tests validating all 7 entity templates, CSV generation, error detection (missing fields, duplicate codes), and transaction commit.
- `backend/src/modules/import/import.controller.spec.ts`: Controller endpoint delegation tests.
- 100% test pass rate across 8 unit tests.

## 13. Audit & Compliance
- Commits generate comprehensive `AuditEvent` records documenting user identity, timestamp, entity type, and total imported record counts.

