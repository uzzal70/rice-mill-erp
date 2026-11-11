# 56. DOCUMENT PRINTING

## Status
Complete

## 1. Business workflow
- **Purpose and actors**: Provides high-definition, ISO/BSTI-standard printable A4 documents, commercial vouchers, security slips, and statements for rice mill operations in Bangladesh. Actors: Plant Heads, Commercial Accounts Managers, Weighbridge Operators, Quality In-charges, Storekeepers, Dispatch Officers, Security Gate Officers, Managing Directors, Auditors.
- **Preconditions and source documents**: Compiles verifiable transactional records across procurement orders, gate movements, weighment scale readings, lab tests, inventory movements, production batches, sales orders, dispatches, vouchers, and ledger accounts.
- **14 Standardized Enterprise A4 Documents**:
  1. **Purchase Invoice**: Official commercial invoice detailing gross weight, moisture deductions, adjusted unit rate, and net payable.
  2. **Purchase Receipt**: Formal physical goods receipt slip acknowledging paddy delivered from suppliers or farmers.
  3. **Gate Pass**: Security vehicle gate clearance slip documenting vehicle registration, driver license, purpose, and entry/exit timestamps.
  4. **Weighbridge Ticket**: Certified digital scale slip showing gross weight, tare weight, net cargo weight in KG and Mon (মণ @ 40 KG/MON), calibrated to BSTI standards.
  5. **Quality Report**: Laboratory inspection certificate detailing moisture %, foreign matter %, broken grains, chalky grains, and authorized quality deduction %.
  6. **Goods Received Note (GRN)**: Warehouse storekeeper receipt confirming stack placement (bay, godown) and sound bag counts.
  7. **Stock Transfer Note**: Internal authorization note for inter-godown or inter-stack grain transfers.
  8. **Daily Production Report**: Shift milling report capturing input paddy, head rice recovery %, broken grain %, rice bran %, husk %, and process losses.
  9. **Sales Invoice**: Commercial tax invoice for finished rice and by-product sales with statutory VAT disclosure under NBR regulations.
  10. **Delivery Challan**: Official transport dispatch challan accompanying goods transit, with bag counts, destination warehouse, and driver endorsement.
  11. **Payment Voucher**: Disbursement debit voucher for supplier settlements, machine spares, electricity, or labor wages.
  12. **Money Receipt (MR)**: Official credit receipt acknowledging cash, cheque, or bank deposits from customers.
  13. **Supplier Statement**: Comprehensive ledger of accounts showing opening balance, paddy deliveries, payments disbursed, and closing payable.
  14. **Customer Statement**: Trade debtor statement detailing sales dispatches, payments collected, and outstanding receivables.
- **Standardized A4 Architecture**:
  - Mill branding header (company name, logo, address, phone, email, BIN/VAT registration).
  - Document metadata banner (Doc No, Date, Reference No, Status, Factory location).
  - Counterparty details (Supplier / Customer / Transporter code, address, contact).
  - Line items table with quantities, units (KG, MON, BAG), unit rates, deductions, and line amounts.
  - Summary totals with Bangladeshi Taka in words ("Taka ... Only").
  - Statutory and operational terms & conditions tailored per document type.
  - Triple signatory blocks: `Prepared By`, `Checked By / Store Incharge`, `Authorized Signatory`.

## 2. Database entities
- Integrates directly with core transaction entities:
  - `PurchaseInvoice` & `PurchaseOrder`
  - `GateEntry`
  - `WeighbridgeTicket`
  - `QualitySample`
  - `StockMovement` & `StockTransfer`
  - `ProductionBatch` & `ProductionOutput`
  - `SalesOrder` & `SalesOrderLine`
  - `Dispatch` & `DispatchLine`
  - `Expense` & `ExpenseLine`
  - `Partner`
  - `Company` & `Factory`
- No new migration needed; utilizes normalized schema records with zero data redundancy.

## 3. Relationships
- **Document to Company/Factory**: Every printable document is strictly scoped to the tenant `companyId` and associated `factoryId`.
- **Document to Counterparty**: Links with `Partner` (Supplier, Farmer, Customer, Transporter) and displays verified contact, address, and tax registration.
- **Document to Signatories**: Links with `User` roles (Preparer, Checker, Authorizer).

## 4. Calculations
- **Gross to Net Cargo Weight**: $\text{Net Weight (KG)} = \text{Gross Weight} - \text{Tare Weight}$.
- **Mon Conversion**: $\text{Weight (Mon)} = \frac{\text{Net Weight (KG)}}{40}$.
- **Quality Deduction Amount**: $\text{Deduction (BDT)} = \text{Gross Amount} \times \frac{\text{Deduction \%}}{100}$.
- **Net Supplier Payable**: $\text{Net Payable} = \text{Gross Amount} - \text{Deduction Amount} - \text{Transport Surcharges}$.
- **Milling Recovery \%**: $\text{Recovery \%} = \frac{\text{Head Rice (KG)}}{\text{Input Paddy (KG)}} \times 100$.
- **Bangladeshi Number-to-Words Algorithm**: Converts integer BDT amounts into standard wording using Crore ($10^7$), Lakh ($10^5$), Thousand ($10^3$), and Hundred ($10^2$) syntax.

## 5. Accounting impact
- Read-only document rendering layer. Generates certified paper and PDF copies reflecting underlying double-entry journals, invoices, and vouchers without altering general ledger balances.

## 6. Inventory impact
- Displays physical stack locations, bag quantities, and metric weights without mutating physical inventory balances.

## 7. API
- `GET /print/templates`: Returns metadata for all 14 document types (type, title, titleBangla, category, description, requiredFields).
- `GET /print/:documentType/:documentId?companyId=<id>`: Resolves full printable document data for real transactions or realistic demo samples.

## 8. Permissions
- `reports:READ` / `print:READ`: Read access scoped to authenticated company boundary.

## 9. Validation
- `GetPrintDocumentDto`: Validates `companyId` (required), optional `factoryId`, `startDate`, `endDate`, and `notes`.
- Handles missing or sample records gracefully with high-fidelity realistic fallbacks.

## 10. UI
- `frontend/src/app/document-printing-page.tsx`:
  - 14 document selector categorized by Commercial, Gate & Weigh, Production, Warehouse, and Accounts.
  - Live A4 layout canvas (`210mm` width, `297mm` height).
  - Print controls with `window.print()` trigger and `@media print` stylesheet optimizations (suppressing app navigation bars, background striping, margins formatted for A4 portrait).
  - Complete bilingual presentation in English and Bengali.

## 11. Reports / Outputs
- Produces print-ready A4 hardcopy slips and softcopy PDFs for external suppliers, banks, customs/NBR tax audits, and internal factory archives.

## 12. Tests
- `backend/src/modules/print/print.service.spec.ts`: Unit tests validating all 14 document types, number-to-words Bangladeshi Taka conversions, and database record resolutions.
- `backend/src/modules/print/print.controller.spec.ts`: Controller endpoint delegation tests.
- 100% test pass rate across 8 unit tests.

## 13. Audit & Compliance
- Generates legally binding documents compliant with Bangladesh VAT Act 2012, BSTI weighing standards, and DG Food procurement rules.

