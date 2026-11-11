# 58. GLOBAL SEARCH

## Status
Complete

## 1. Business workflow
- **Purpose and actors**: Provides an instant, cross-entity spotlight search command center invoked globally via `CTRL + K` (or `CMD + K` on macOS) across all 12 core rice mill operational domains. Actors: Plant Managers, Commercial Accountants, Weighbridge Operators, Storekeepers, Dispatch Clerks, Security Officers, Managing Directors.
- **Preconditions and source documents**: Leverages indexed relational database records across procurement, logistics, laboratory, inventory, production, sales, and general ledger disbursements.
- **12 Indexed Operational Domains**:
  1. **Supplier**: Aratdars, paddy grain suppliers, commission brokers (`Partner`).
  2. **Farmer**: Direct primary grain producers and contract growers (`Partner`).
  3. **Customer**: Wholesale rice distributors, institutional buyers, retailers (`Partner`).
  4. **Vehicle**: Factory fleet and third-party commercial transport trucks (`Vehicle`).
  5. **Invoice**: Commercial purchase invoices and sales order bills (`PurchaseInvoice`, `SalesOrder`).
  6. **Purchase**: Contracted paddy purchase orders and supplier agreements (`PurchaseOrder`).
  7. **Sales**: Finished rice sales orders, contracts, and delivery commitments (`SalesOrder`).
  8. **Batch**: Auto-milling production batches and husking runs (`ProductionBatch`).
  9. **Stock**: Finished rice varieties, raw paddy items, by-products, and stack bins (`Item`, `Stack`).
  10. **Gate Pass**: Inbound/outbound security gate entries and vehicle movement passes (`GateEntry`).
  11. **Weighbridge Ticket**: Certified digital gross, tare, and net weighment scale slips (`WeighbridgeTicket`).
  12. **Payment**: Operational expense vouchers, diesel logs, and vendor disbursements (`Expense`).
- **Interactive Global Navigation**:
  - Global hotkey `CTRL + K` or `CMD + K` immediately invokes modal from anywhere in the app.
  - Arrow key navigation (`↑`, `↓`), `Enter` to jump directly to the target record workspace, and `ESC` to dismiss.
  - Category filter pills to isolate specific entities.
  - Bilingual search matching in English and Bengali.

## 2. Database entities
- Queries 12 existing normalized database entities:
  - `Partner` (Supplier, Farmer, Customer, Broker)
  - `Vehicle`
  - `PurchaseInvoice`
  - `PurchaseOrder`
  - `SalesOrder`
  - `ProductionBatch`
  - `Item` & `Stack`
  - `GateEntry`
  - `WeighbridgeTicket`
  - `Expense`
- Built on top of existing indexed columns (`code`, `name`, `phone`, `orderNumber`, `invoiceNumber`, `ticketNumber`, `batchNumber`, `gateNumber`, `vehicleNumber`). Zero additional database storage overhead.

## 3. Relationships
- **Multi-Tenant Isolation**: Every query automatically injects `where: { companyId }`, strictly isolating enterprise data between tenants.
- **Record to Workspace Routing**: Every search result item carries a `navigationKey` resolving to the appropriate ERP module view.

## 4. Calculations
- **Category Counts**: Aggregates match counts per entity category $\text{Count}(c) = \sum_{r \in R} [r.\text{category} == c]$.
- **Execution Parallelism**: Dispatches parallel `Promise.all` database queries to maintain sub-50ms query turnaround times.

## 5. Accounting impact
- Read-only search indexing layer. Does not post, modify, or delete financial records.

## 6. Inventory impact
- Read-only lookup across items, godowns, stacks, and current movement tags without altering stock balances.

## 7. API
- `GET /search/global?companyId=<id>&query=<str>&category=<cat>&limit=<n>`:
  - Returns `query`, `totalMatches`, `categoryCounts`, and ranked `results` array with badges, bilingual labels, and navigation targets.

## 8. Permissions
- `dashboard:READ`: Access global search across authorized company records.

## 9. Validation
- `GlobalSearchQueryDto`: Validates `companyId` (required), query string trimming, optional category filter enum, and pagination limit clamp ($\le 50$).

## 10. UI
- `frontend/src/app/global-search-dialog.tsx`:
  - Global `window.addEventListener('keydown')` listener for `CTRL + K` and `CMD + K`.
  - Top search bar trigger button with keyboard badge in header AppBar.
  - Category chips for all 12 entity types.
  - Full keyboard accessibility: Up/Down arrow selection, Enter to navigate, ESC to close.
  - Bilingual English / Bengali presentation.

## 11. Reports / Outputs
- Instant cross-functional navigation hub connecting operational frontline staff directly to records.

## 12. Tests
- `backend/src/modules/search/search.service.spec.ts`: Unit tests validating query handling, empty search queries, and parallel query resolution across all 12 entities.
- `backend/src/modules/search/search.controller.spec.ts`: Controller endpoint delegation tests.
- 100% test pass rate across 5 unit tests.

## 13. Audit & Compliance
- Compliant with multi-tenant company isolation boundaries, ensuring confidential commercial, farmer, and financial data is never exposed cross-tenant.

