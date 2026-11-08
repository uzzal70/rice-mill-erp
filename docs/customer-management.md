# Customer Management (#36)

## Status
Complete for Customer Master, Protected Financial Defaults (Credit Limit, Payment Terms, Opening Balance), and Customer Statement & Sales Ledger. Sales Invoice, Dispatch, and Payment Ledger links connect as subsequent serial phases are executed.

## 1. Business workflow
- **Purpose and actors**: Centrally manage rice mill customers across Wholesale, Retail, Dealer, Distributor, Institutional, Cash, Credit, and Export channels. Primary actors: Sales Manager, Accounts Manager, Accountant, and Credit Controller.
- **Preconditions and source documents**: Active company, unique company-scoped customer code, partner identity (`PartnerType.CUSTOMER`).
- **States and transitions**:
  - Customer Profile: `active = true` (Active, able to transact) ↔ `active = false` (Inactive, blocked from new orders).
  - Financial Terms: Configurable credit limit, payment terms (days), and opening balance.
- **Approval, posting, cancellation, correction/reversal**:
  - Customer financial terms (credit limit, payment terms, opening balance) require elevated `VIEW_FINANCIAL` permission and are audited in `AuditEvent`.
  - Customer statement aggregates approved sales orders, credit limit, opening balance, and calculates current total due and available credit.
- **Company/factory/location and ownership scope**: Strictly company-scoped (`companyId`). Stored in `Partner` with `type = CUSTOMER`.

## 2. Database entities
- **`Partner`** (`type = CUSTOMER`):
  - Identity fields: `customerName` (`name`), `businessName`, `code`, `mobile` (`phone`), `email`, `address`, `nid`, `tin`, `bin`, `active`.
  - Financial fields: `creditLimit` (Decimal 18,2), `paymentTermsDays` (Int), `openingBalance` (Decimal 18,2), `bankName`, `bankAccount`, `paymentMethod`.
  - Unique: `[companyId, code]`, `[companyId, id]`.
  - Indexes: `[companyId, type, name]`.

## 3. Relationships
- Parent/child:
  - `Company` (1) → `Partner` (N)
  - `Partner` (1) → `SalesQuotation` (N) (`@relation("SalesQuotationCustomer")`)
  - `Partner` (1) → `SalesOrder` (N) (`@relation("SalesOrderCustomer")`)
- Retention: `ON DELETE RESTRICT` on all relations to maintain transactional integrity.

## 4. Calculations
- **Total Approved Orders**:
  $$\text{TotalApprovedOrders} = \sum_{\text{status}=\text{APPROVED}} \text{SalesOrder.totalAmount}$$
- **Current Outstanding Due**:
  $$\text{TotalDue} = \text{openingBalance} + \text{TotalApprovedOrders} - \text{TotalPaid}$$
- **Available Credit**:
  $$\text{AvailableCredit} = \text{creditLimit} - \text{TotalDue}$$
  If $\text{AvailableCredit} < 0$, credit is overdrawn; new credit orders are blocked by #35 Sales credit control engine.

## 5. Accounting impact
- Customer master establishes the Accounts Receivable sub-ledger counterparty.
- Customer opening balance sets initial debtor exposure.
- Changes to financial terms are audited in `AuditEvent`.

## 6. Inventory impact
- Customer profile master does not directly impact stock balances.
- Approved sales orders link customer reservations to physical warehouse stacks.

## 7. API
- `GET /partners?type=CUSTOMER` (list customer profiles with search and pagination).
- `GET /partners/:id` (public profile view; bank/credit details redacted).
- `GET /partners/:id/financial` (financial terms view; requires `partners:VIEW_FINANCIAL`).
- `PUT /partners/:id/financial` (financial terms update; requires `partners:UPDATE` + `partners:VIEW_FINANCIAL`).
- `POST /partners` (create customer profile; requires `partners:CREATE`).
- `PATCH /partners/:id` (update customer profile; requires `partners:UPDATE`).
- `GET /partners/:id/customer-ledger` (customer sales ledger & statement; requires `partners:VIEW_FINANCIAL`).

## 8. Permissions
- `partners:READ`: Read basic customer profile (name, code, address, phone).
- `partners:CREATE`: Create new customer profile.
- `partners:UPDATE`: Edit customer profile.
- `partners:VIEW_FINANCIAL`: Access and update credit limit, payment terms, opening balance, and view customer statement/ledger.

## 9. Validation
- Customer code must be unique within the company.
- Rejects access to supplier/farmer purchase ledgers for customer partners.
- Rejects customer-ledger access for non-customer partners.
- Credit limits and opening balances are validated against decimal formats.

## 10. UI
- Bilingual (English / বাংলা) desk in `frontend/src/app/supplier-farmer-master-page.tsx`.
- Partner type selector: **Customers** (`ক্রেতা`).
- Profile Dialog: Customer name, business name, phone, email, address, NID, TIN, BIN, active switch.
- Financial Defaults Dialog: Protected bank name, account, payment method, credit limit (BDT), payment terms (days), opening balance (BDT).
- Customer Statement / Ledger Dialog:
  - Summary metrics: Opening Due, Total Approved Orders, Current Total Due, Credit Limit, and Available Credit.
  - Interactive Sales Orders table: Order No, Factory, Channel, Items, Amount, Status, and Date.

## 11. Reports
- Customer ledger statement.
- Customer aging & credit exposure summary.
- Customer directory with TIN/BIN/NID tax register.

## 12. Tests
- `backend/src/modules/partners/partners.service.spec.ts`:
  - Normalized customer profile creation and field redaction on ordinary read.
  - Protected financial defaults access and validation.
  - Customer ledger query: approved orders total, due balance, and available credit calculation.
  - Rejection of customer ledger for non-customer partners.
  - Rejection of purchase ledger for customer partners.
- `backend/src/modules/partners/partners.controller.spec.ts`:
  - Permission metadata verified for `customerLedger`, `ledger`, `getFinancial`, and `updateFinancial`.

## 13. Implementation and verification
- Files changed:
  - `backend/src/modules/partners/partners.service.ts`
  - `backend/src/modules/partners/partners.controller.ts`
  - `backend/src/modules/partners/partners.service.spec.ts`
  - `backend/src/modules/partners/partners.controller.spec.ts`
  - `frontend/src/app/supplier-farmer-master-page.tsx`
  - `docs/customer-management.md`
- Verification:
  - 28 backend test suites (170 tests) passed.
  - Backend build (`nest build`) passed.
  - Frontend typecheck (`tsc --noEmit`) and build (`next build`) passed.
