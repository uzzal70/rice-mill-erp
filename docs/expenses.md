# Expense Management (#40)

## Status
Complete for Factory Overheads, Power & Energy, Direct Milling/Production Overheads, Labor Wages, Vehicle/Transport Logistics, Multi-Level Approvals, Double-Entry General Ledger Posting (Dr Expense = Cr Cash/Bank/Payable), Printable Vouchers, and Bilingual Frontend Desk.

## 1. Business workflow
- **Purpose and actors**: Digitally manage, track, approve, and account for all operational, production, administrative, logistics, and plant overhead expenditures incurred by the rice mill.
  - Primary actors: Accounts Officer, Factory Manager, Production Supervisor, Store Manager, Accounts Manager, and Managing Director / Owner.
- **Expense Categories**:
  - `ELECTRICITY`: Power grid bills, transformer charges, sub-station maintenance, peak/off-peak industrial tariffs.
  - `DIESEL`: Fuel for diesel generators during load shedding, tractor, forklift, and boiler burner pre-heating.
  - `GAS`: Natural gas / LPG for boiler steaming and dryer burners.
  - `LABOUR`: Contract daily wages, drying yard workers, loading/unloading bagging labor, and line helpers.
  - `REPAIR`: Breakdown machinery repairs, welder/lathe mechanic call-outs, emergency motor rewinding.
  - `MAINTENANCE`: Scheduled overhaul, de-stoner screen replacements, polisher emery stone refacing, elevator belt replacements.
  - `TRANSPORT`: Inter-godown transport freight, external truck cartage, vehicle diesel/tolls.
  - `LOADING`: Truck loading wages, manual stacking labor.
  - `UNLOADING`: Paddy intake unloading from river barges, trucks, and tractor trolleys.
  - `PACKAGING`: Gunny bags, PP woven bags, sewing yarn, inner polyethylene liners, ink stencils.
  - `RENT`: Warehouse / godown lease rent, weighing bridge premises rent, branch office rent.
  - `SECURITY`: Night guards, CCTV camera service, perimeter security guard contractor charges.
  - `OFFICE`: Office stationery, broadband internet, accounting software, entertainment, tea/refreshments.
  - `MISCELLANEOUS`: Trade licensing, government factory inspection fees, BSTI renewal, pest control fumigation.
- **Expense Types (Cost Centers & Functional Allocations)**:
  - `FACTORY_EXPENSE`: Plant running costs, factory utilities, general security.
  - `OFFICE_EXPENSE`: Head office / branch office overheads and administrative supplies.
  - `PRODUCTION_EXPENSE`: Direct conversion expenses allocated to specific production lines or milling processes.
  - `TRANSPORT_EXPENSE`: Vehicle maintenance, fuel, and external logistics freight.
  - `ADMINISTRATIVE_EXPENSE`: Executive overheads, legal, auditing, and corporate compliance fees.
- **Payment Modes**:
  - `CASH`: Paid out of petty cash fund or cash drawer.
  - `BANK`: Paid via cheque, BEFTN, RTGS, bank transfer, or corporate debit card.
  - `PETTY_CASH`: Disbursed from factory imprest fund.
  - `PAYABLE`: Incurred on credit / unpaid vendor invoice to be settled at a later date.
- **States and transitions**:
  - `DRAFT`: Expense voucher initiated with title, category, type, date, payee/vendor, lines, and receipts.
  - `SUBMITTED`: Forwarded to Accounts Manager or Factory Manager for authorization.
  - `APPROVED`: Authorized for disbursement and posting.
  - `POSTED`: Formal financial recognition: atomically debits expense account, credits cash/bank/payable account, and posts balanced double-entry Journal (`JV-EXP-XXXX`).
  - `REJECTED`: Declined by authorizing officer with recorded rejection reason; can be edited and re-submitted.
  - `CANCELLED`: Voided voucher prior to posting (posted vouchers cannot be cancelled).

## 2. Database entities
- **`Expense`**:
  - `id`: CUID primary key.
  - `companyId`, `factoryId`: Multi-tenant and facility scoping.
  - `voucherNumber`: Unique sequential voucher code (e.g. `EXP-202611-0001`).
  - `title`: Operational title / description of expense.
  - `category`: `ExpenseCategory` enum (14 categories).
  - `type`: `ExpenseType` enum (5 functional types).
  - `paymentMode`: `ExpensePaymentMode` (`CASH`, `BANK`, `PETTY_CASH`, `PAYABLE`).
  - `status`: `DocumentStatus` (`DRAFT`, `SUBMITTED`, `APPROVED`, `POSTED`, `REJECTED`, `CANCELLED`).
  - `expenseDate`: Date of expenditure.
  - `payeeName`: Name of vendor, contractor, driver, or payee.
  - `payeePartnerId`: Optional link to `Partner` (Supplier/Vendor/Broker/Customer).
  - `vehicleId`: Optional link to `Vehicle` (for transport/fuel expenses).
  - `productionLineId`: Optional link to `ProductionLine` (for direct milling/production expenses).
  - `bankName`, `bankAccount`, `chequeOrTxnNumber`: Banking details when paid via bank.
  - `billReference`: Physical receipt, cash memo, or invoice reference number.
  - `subtotalAmount`: Sum of line items in BDT.
  - `taxAmount`: VAT / Tax amount in BDT (default 0).
  - `totalAmount`: Final payable amount in BDT ($\text{subtotal} + \text{tax}$).
  - `remarks`: Operational notes.
  - `rejectionReason`: Reason text when rejected.
  - `createdById`, `approvedById`, `postedById`, `rejectedById`: User stamps.
  - `approvedAt`, `postedAt`, `createdAt`, `updatedAt`: Audit timestamps.
  - Unique: `[companyId, voucherNumber]`, `[companyId, factoryId, id]`.
  - Indexes: `[companyId, factoryId, status, expenseDate]`, `[companyId, category, expenseDate]`, `[companyId, type, expenseDate]`, `[companyId, payeePartnerId]`.
- **`ExpenseLine`**:
  - `id`: CUID primary key.
  - `companyId`, `factoryId`, `expenseId`.
  - `description`: Detailed line item breakdown.
  - `quantity`: Optional quantity / unit count (e.g. Liters, Bags, Hours).
  - `unitPrice`: Optional unit rate.
  - `amount`: Line net amount in BDT ($\text{qty} \times \text{rate}$ or lump sum).
  - `accountCode`: Derived general ledger code (e.g. `EXP_ELECTRICITY`, `EXP_DIESEL`).
  - Foreign key: `[companyId, factoryId, expenseId]` references `Expense` (`ON DELETE CASCADE`).
- **Migration**: `0029_expense_management`.

## 3. Relationships
- Parent/child:
  - `Company` (1) → `Expense` (N) → `ExpenseLine` (N)
  - `Factory` (1) → `Expense` (N)
  - `Partner` (1) → `Expense` (N) (optional payee vendor)
  - `Vehicle` (1) → `Expense` (N) (optional transport allocation)
  - `ProductionLine` (1) → `Expense` (N) (optional milling line allocation)
  - `Expense` (1) → `Journal` (1) (polymorphic via `sourceType: 'EXPENSE'`, `sourceId: expense.id`)
- Retention: `ON DELETE RESTRICT` on all external entity relations; `ON DELETE CASCADE` from `Expense` to its own `ExpenseLine` items.

## 4. Calculations
- **Line Item Net Amount**:
  $$\text{lineAmount} = \begin{cases} \text{round}(\text{quantity} \times \text{unitPrice}, 2) & \text{if qty and price provided} \\ \text{amount} & \text{direct lump sum} \end{cases}$$
- **Subtotal Amount**:
  $$\text{subtotalAmount} = \sum_{i=1}^n \text{lineAmount}_i$$
- **Total Amount**:
  $$\text{totalAmount} = \text{round}(\text{subtotalAmount} + \max(0, \text{taxAmount}), 2)$$
- **Double-Entry Balance Verification**:
  $$\text{Total Debit} = \text{Total Credit} = \text{totalAmount}$$

## 5. Accounting impact
- Every expense posting generates an official double-entry `Journal` voucher in the General Ledger:
  - **Number**: `JV-EXP-{voucherNumber}`
  - **Source Type**: `'EXPENSE'`
  - **Source ID**: `expense.id`
  - **Status**: `POSTED`
  - **Currency**: `'BDT'`
- **Debit Entry**:
  - **Account**: `EXP_{CATEGORY}` (e.g. `EXP_ELECTRICITY`, `EXP_DIESEL`, `EXP_LABOUR`, `EXP_MAINTENANCE`, `EXP_TRANSPORT`, etc.)
  - **Description**: `Expense: {title} ({voucherNumber})`
  - **Debit**: `expense.totalAmount`
  - **Credit**: `0.00`
- **Credit Entry**:
  - **Account**:
    - `ASSET_CASH` (if `paymentMode === 'CASH'`)
    - `ASSET_BANK` (if `paymentMode === 'BANK'`)
    - `ASSET_PETTY_CASH` (if `paymentMode === 'PETTY_CASH'`)
    - `LIABILITY_ACCOUNTS_PAYABLE` (if `paymentMode === 'PAYABLE'`)
  - **Description**: `Payment for {voucherNumber} via {paymentMode}`
  - **Debit**: `0.00`
  - **Credit**: `expense.totalAmount`
- **Rule**: $\text{TOTAL DEBIT} = \text{TOTAL CREDIT}$ is mathematically enforced in every transaction.

## 6. Inventory impact
- Direct expense vouchers do not directly increment or decrement finished goods or raw paddy physical stock.
- Production/Milling expenses allocated to `ProductionLine` or `ProductionBatch` feed into the upcoming **Cost of Production (COP)** and **Unit Landed Milling Cost** calculations (Section 44 Profitability Engine).
- Packaging bag purchases logged as expense directly correlate with packaging stock receipt reconciliations.

## 7. API contract
- `GET /api/expenses`: List expenses with search, category, type, payment mode, status, and date filters.
- `GET /api/expenses/summary`: Real-time KPI summaries: total amount, posted amount, pending approval count & amount, category breakdown, type breakdown, and payment mode breakdown.
- `GET /api/expenses/:id`: Retrieve single expense voucher with lines, payee partner, vehicle, and line relations.
- `POST /api/expenses`: Create a new expense voucher in `DRAFT` status.
- `PUT /api/expenses/:id`: Update draft or rejected expense and recalculate lines/totals.
- `POST /api/expenses/:id/submit`: Submit draft expense for managerial review (`DRAFT` $\to$ `SUBMITTED`).
- `POST /api/expenses/:id/approve`: Approve voucher for payment and posting (`SUBMITTED` $\to$ `APPROVED`).
- `POST /api/expenses/:id/reject`: Reject voucher with mandatory reason (`SUBMITTED` $\to$ `REJECTED`).
- `POST /api/expenses/:id/post`: Post approved voucher to General Ledger, generating double-entry journal (`APPROVED` $\to$ `POSTED`).
- `POST /api/expenses/:id/cancel`: Void draft or approved voucher prior to posting.
- `DELETE /api/expenses/:id`: Delete draft or cancelled voucher.

## 8. Access control & permissions
- Resource: `expenses`
- Required permissions:
  - `expenses:READ`: View expense list, summaries, vouchers, and print preview.
  - `expenses:CREATE`: Create new expense voucher, add lines, and submit for approval.
  - `expenses:UPDATE`: Edit draft/rejected voucher lines or cancel voucher.
  - `expenses:APPROVE`: Authorize or reject submitted expense vouchers.
  - `expenses:POST`: Post approved voucher to General Ledger and trigger journal creation.
  - `expenses:DELETE`: Remove draft vouchers.

## 9. Validation & edge cases
- **Multi-tenancy isolation**: Company ID and Factory ID are validated against caller's active scope. Payee partners, vehicles, and production lines must belong to the active company/factory.
- **Empty line guard**: Expense creation or update requires at least one line item with valid description and positive amount.
- **Non-negative tax**: Tax amount cannot be negative.
- **State guards**:
  - Only `DRAFT` or `REJECTED` vouchers can be edited or deleted.
  - Only `APPROVED` (or `SUBMITTED`) vouchers can be posted.
  - `POSTED` vouchers cannot be cancelled or deleted (must be adjusted via formal journal reversal).
- **Double-posting prevention**: Calling post on an already posted voucher throws `ConflictException`.
- **Mandatory rejection reason**: Rejecting a voucher without a non-empty reason throws `BadRequestException`.

## 10. UI specifications
- Dedicated Desk at `frontend/src/app/expenses-page.tsx`.
- **Key components**:
  - **KPI Header**: Total Expenses (BDT), Posted to GL (BDT), Pending Approval (Count & BDT), and Milling & Factory Overheads (BDT).
  - **Filter Toolbar**: Full-text search, Category filter (14 categories), Cost Center Type filter (5 types), Status filter, and Refresh button.
  - **Expense Register Table**: Voucher #, Date, Title, Category badge, Cost Center, Payee/Vendor, Payment Mode, Total Amount (BDT), Status chip, and contextual Action buttons.
  - **New / Edit Voucher Dialog**: Multi-line item grid with dynamic row addition/deletion, auto-computed subtotal, tax amount, and total payable.
  - **Approval / Rejection Dialog**: Modal with prompt for rejection reason.
  - **GL Posting Confirmation Dialog**: Interactive preview displaying the exact double-entry accounting distribution (Debit Account, Credit Account, Amounts) before posting.
  - **Printable Expense Voucher Dialog**: Official formal voucher layout ready for `window.print()`, complete with header, meta fields, line breakdown table, and 4-tier signature blocks (Prepared By, Verified By, Accounts Officer, Factory Manager).

## 11. Reports & analytics
- **Expense Summary by Category**: Percentage distribution across electricity, fuel, labor, repairs, transport, etc.
- **Cost Center Breakdown**: Factory vs Office vs Production vs Transport vs Administrative overheads.
- **Monthly Expense Trend**: Historical expense registers for cost containment and budget variance analysis.
- **Double-Entry Journal Register**: Audit trail of all `JV-EXP-XXXX` journals posted into the general ledger.

## 12. Automated tests
- **Service Unit Tests (`backend/src/modules/expenses/expenses.service.spec.ts`)**:
  - Creating draft expenses with lines, subtotal, and tax computation.
  - Rejecting creation when active factory is not found.
  - Rejecting creation when lines are missing or amounts are negative.
  - Updating draft expenses and recalculating lines.
  - Guarding against editing already posted expenses.
  - Submitting vouchers for approval.
  - Approving vouchers and stamping authorizing officer metadata.
  - Rejecting vouchers with audit reason.
  - Posting approved expenses to General Ledger with balanced double-entry journal ($\text{Total Debit} = \text{Total Credit}$).
  - Preventing double-posting and preventing cancellation of posted vouchers.
  - Aggregating summary KPIs by category, type, and payment mode.
  - Deleting draft vouchers.
- **Controller Unit Tests (`backend/src/modules/expenses/expenses.controller.spec.ts`)**:
  - Verifying all 11 endpoints and RBAC permission metadata bindings.

## 13. Manual verification checklist
1. Log in as Accounts Officer or Factory Manager.
2. Open **Expenses & Overheads** from the navigation menu.
3. Click **New Expense Voucher**, enter title "Generator Diesel Purchase", Category: `DIESEL`, Cost Center: `PRODUCTION_EXPENSE`, Payment Mode: `CASH`.
4. Add line: Description: "500 Liters Diesel", Qty: 500, Rate: 108.00 $\to$ Auto computes Amount: 54,000.00 BDT.
5. Click **Save as Draft** $\to$ Voucher `EXP-202611-0001` appears in table with `DRAFT` badge.
6. Click **Submit** $\to$ Status changes to `SUBMITTED`.
7. Click **Approve** $\to$ Status changes to `APPROVED`.
8. Click **Post GL** $\to$ Modal displays the double-entry preview:
   - Dr: `EXP_DIESEL` (54,000.00 BDT)
   - Cr: `ASSET_CASH` (54,000.00 BDT)
   - Confirms Total Debit = Total Credit.
9. Click **Post to General Ledger** $\to$ Status updates to `POSTED`, and KPI card "Posted to GL" increments by 54,000 BDT.
10. Click the **Print** icon on the voucher $\to$ Formal printable layout displays with mill header, line table, and signature blocks.

