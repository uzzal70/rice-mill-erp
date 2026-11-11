# Accounting Engine (#41)

## Status
Complete for Real Double-Entry General Ledger Engine, Standard Rice Mill Chart of Accounts (COA), Journal Vouchers, Payment Vouchers, Receipt Vouchers, Contra Vouchers, General Ledger, Cash Book, Bank Book, Trial Balance ($\sum \text{Debits} = \sum \text{Credits}$), Profit & Loss Statement, Balance Sheet, Sub-Ledgers, Printable Vouchers, and Bilingual Frontend Desk.

## 1. Business workflow
- **Purpose and actors**: Provide a fully integrated, mathematically validated Double-Entry General Ledger accounting engine that tracks all financial transactions across procurement, inventory, production, sales, expenses, and banking operations for the rice mill enterprise.
  - Primary actors: Accounts Officer, Chief Accountant / Accounts Manager, Internal Auditor, Factory Manager, and Managing Director / Owner.
- **Fundamental Rule: Real Double-Entry Bookkeeping**:
  $$\text{TOTAL DEBIT} = \text{TOTAL CREDIT}$$
  Every single posted financial transaction (manual or automated) must generate matching debits and credits. Transactions with unequal debits and credits are strictly rejected by the database and business logic layer.
- **Core Sub-Modules**:
  - **Chart of Accounts (COA)**: Five account classifications (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`) with standard 26+ industrial sub-heads for auto/semi-auto rice mills.
  - **Journal Vouchers (`JV`)**: General journal adjustments, depreciation, and process loss entries.
  - **Payment Vouchers (`PV`)**: Cash, bank, and cheque disbursements to paddy suppliers, packaging vendors, labor contractors, and utility bills.
  - **Receipt Vouchers (`RV`)**: Inward collections from wholesale grain dealers, retail customers, and commercial milling clients into cash drawers or bank accounts.
  - **Contra Vouchers (`CV`)**: Internal fund transfers between Cash in Hand and Bank accounts, or between different commercial bank accounts.
  - **General Ledger (GL)**: Chronological transactional record of every account with running debit/credit balances.
  - **Cash Book & Bank Book**: Dedicated cash and bank registers tracking daily receipts, payouts, and closing balances.
  - **Trial Balance (TB)**: Verification of mathematical equilibrium across all accounts.
  - **Financial Statements**:
    - **Profit & Loss Statement (P&L)**: Revenue, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, and Net Profit.
    - **Balance Sheet (Statement of Financial Position)**: $\text{Assets} = \text{Liabilities} + \text{Equity}$.

## 2. Database entities
- **`Account`**:
  - `id`: CUID primary key.
  - `companyId`: Multi-tenant boundary.
  - `code`: Unique code (e.g. `1010`, `1020`, `1050`, `2010`, `4010`, `5010`).
  - `name`: Account title (e.g. "Cash in Hand", "Agrani Bank Current A/C", "Finished Rice Sales Revenue").
  - `type`: `AccountType` (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
  - `subtype`: `AccountSubtype` (20 specific categories including `CASH`, `BANK`, `ACCOUNTS_RECEIVABLE`, `INVENTORY_RAW`, `INVENTORY_FINISHED`, `ACCOUNTS_PAYABLE`, `COST_OF_GOODS_SOLD`, `DIRECT_EXPENSE`, `OPERATING_REVENUE`, etc.).
  - `currency`: Default `'BDT'`.
  - `openingBalance`: Initial financial balance in BDT.
  - `currentBalance`: Real-time computed balance in BDT.
  - `isSystem`: Boolean protecting essential control accounts from accidental deletion or deactivation.
  - `active`: Boolean active status.
  - `description`: Operational remarks.
  - `parentId`: Optional link for hierarchical account structures.
  - Unique: `[companyId, code]`, `[companyId, id]`.
  - Indexes: `[companyId, type]`, `[companyId, subtype]`, `[companyId, active]`.
- **`Journal`**:
  - `id`: CUID primary key.
  - `companyId`: Multi-tenant boundary.
  - `number`: Unique sequential voucher number (`JV-YYYYMM-XXXX`, `PV-YYYYMM-XXXX`, `RV-YYYYMM-XXXX`, `CV-YYYYMM-XXXX`).
  - `voucherType`: `VoucherType` (`JOURNAL`, `PAYMENT`, `RECEIPT`, `CONTRA`, `SALES`, `PURCHASE`, `EXPENSE`, `OPENING`).
  - `sourceType`: Origin identifier (`'MANUAL'`, `'EXPENSE'`, `'SALES'`, `'PURCHASE'`, `'REVERSAL'`).
  - `sourceId`: Reference to triggering entity or unique voucher identifier.
  - `status`: `JournalStatus` (`DRAFT`, `POSTED`, `REVERSED`).
  - `currency`: Default `'BDT'`.
  - `voucherDate`: Date of financial transaction.
  - `narration`: General description or reason for entry.
  - `totalAmount`: Sum of total debits (which equals total credits).
  - `factoryId`: Optional facility scoping.
  - `createdById`: Author user identifier.
  - `chequeOrRefNo`: Cheque number, bank transaction ID, or bill reference.
  - `partnerId`: Optional customer, farmer, supplier, or broker relation.
  - `postedAt`: Posting timestamp.
  - `reversalOfId`: Foreign key to original journal if this is a reversal voucher.
  - Unique: `[companyId, number]`, `[companyId, id]`, `[sourceType, sourceId]`.
  - Indexes: `[companyId, postedAt]`, `[companyId, voucherDate]`, `[companyId, voucherType]`.
- **`JournalLine`**:
  - `id`: CUID primary key.
  - `journalId`: Foreign key to `Journal` (`ON DELETE CASCADE`).
  - `accountId`: Optional foreign key to `Account` (`ON DELETE RESTRICT`).
  - `accountCode`: Denormalized account code for fast querying and historical auditing.
  - `partnerId`: Optional sub-ledger partner attribution.
  - `description`: Line-level remark or invoice reference.
  - `debit`: Decimal (18, 2) debit amount (default 0).
  - `credit`: Decimal (18, 2) credit amount (default 0).
  - Indexes: `[accountCode]`, `[accountId]`, `[journalId]`.
- **Migration**: `0030_accounting_engine`.

## 3. Relationships
- Parent/child:
  - `Company` (1) → `Account` (N) → `Account` (N) (self-referencing parent/child)
  - `Company` (1) → `Journal` (N) → `JournalLine` (N)
  - `Account` (1) → `JournalLine` (N)
  - `Partner` (1) → `Journal` (N) (optional sub-ledger link)
  - `Journal` (1) → `Journal` (1) (reversal self-reference)

## 4. Calculations
- **Double-Entry Equilibrium Rule**:
  $$\sum_{i=1}^n \text{line}_i.\text{debit} = \sum_{i=1}^n \text{line}_i.\text{credit} = \text{totalAmount}$$
  $$\left|\sum \text{Debit} - \sum \text{Credit}\right| < 0.005 \implies \text{Valid}$$
- **Account Normal Balance Calculations**:
  - **Asset & Expense accounts**:
    $$\text{Balance} = \text{Opening} + \sum \text{Debit} - \sum \text{Credit}$$
  - **Liability, Equity & Revenue accounts**:
    $$\text{Balance} = \text{Opening} + \sum \text{Credit} - \sum \text{Debit}$$
- **Profit & Loss**:
  $$\text{Gross Profit} = \text{Total Revenue} - \text{Total COGS}$$
  $$\text{Net Profit} = \text{Gross Profit} - \text{Operating Expenses}$$
- **Balance Sheet Equation**:
  $$\text{Total Assets} = \text{Total Liabilities} + \text{Total Equity} + \text{Current Year Net Profit}$$

## 5. Accounting impact
- Posting any voucher atomically updates the `currentBalance` of all affected accounts in the Chart of Accounts.
- Reversal of a journal generates a paired reversal voucher (`REV-{number}`) with swapped debits and credits, atomically restoring account balances.

## 6. Inventory impact
- Raw material and finished goods valuations tie directly into inventory accounts:
  - Account `1060` (Raw Paddy Inventory) matches physical paddy lot valuations.
  - Account `1070` (Finished Rice Inventory) matches warehouse finished goods valuation.
  - Account `1080` (By-Product Inventory) tracks broken rice, husk, and bran valuations.
  - Account `5010` (Cost of Raw Paddy Consumed) tracks direct milling consumption for Section 44 Profitability Engine.

## 7. API contract
- **Chart of Accounts**:
  - `GET /api/accounting/coa`: List all accounts with real-time balances.
  - `POST /api/accounting/coa`: Create custom account under any category.
  - `PUT /api/accounting/coa/:id`: Update account title or active status.
  - `POST /api/accounting/coa/seed`: Initialize standard rice mill Chart of Accounts.
- **Journal Vouchers**:
  - `GET /api/accounting/journals`: List vouchers with search, type, and date filters.
  - `GET /api/accounting/journals/:id`: Get single voucher with detailed lines and partner info.
  - `POST /api/accounting/journals`: Create and post balanced voucher (`JOURNAL`, `PAYMENT`, `RECEIPT`, `CONTRA`).
  - `POST /api/accounting/journals/:id/post`: Post draft voucher.
  - `POST /api/accounting/journals/:id/reverse`: Reverse posted voucher with audit reason.
- **Financial Reports & Ledgers**:
  - `GET /api/accounting/reports/gl`: General Ledger statement for specified account and period.
  - `GET /api/accounting/reports/cash-book`: Cash Book register across all physical cash accounts.
  - `GET /api/accounting/reports/bank-book`: Bank Book register across all commercial bank accounts.
  - `GET /api/accounting/reports/trial-balance`: Real-time Trial Balance with mathematical balance verification.
  - `GET /api/accounting/reports/pnl`: Profit & Loss statement with Gross & Net profit margins.
  - `GET /api/accounting/reports/balance-sheet`: Balance Sheet with asset/liability/equity verification.
  - `GET /api/accounting/reports/sub-ledger/:partnerId`: Detailed partner sub-ledger statement.

## 8. Access control & permissions
- Resource: `accounting`
- Required permissions:
  - `accounting:READ`: View COA and voucher list.
  - `accounting:CREATE`: Create accounts and journal vouchers.
  - `accounting:UPDATE`: Edit accounts and draft vouchers.
  - `accounting:POST`: Post and reverse vouchers.
  - `accounting:VIEW_FINANCIAL`: Access General Ledger, Cash Book, Bank Book, Trial Balance, Profit & Loss, and Balance Sheet statements.

## 9. Validation & edge cases
- **Strict Equilibrium Enforcement**: Any journal where debits do not equal credits throws `BadRequestException`.
- **Minimum Line Count**: At least 2 lines required per voucher.
- **Negative Amount Rejection**: Negative values in debit or credit columns are rejected.
- **Single-Sided Line Validation**: A single line cannot have both a debit and credit value.
- **Zero-Line Rejection**: Lines with both 0 debit and 0 credit are rejected.
- **System Account Protection**: Core operational control accounts (`1010`, `1020`, `1050`, `1060`, `1070`, `2010`, `3010`, `4010`, `5010`) cannot be deactivated if they hold an active balance.

## 10. UI specifications
- Dedicated Desk at `frontend/src/app/accounting-page.tsx`.
- **Tabs**:
  1. **Chart of Accounts (COA)**: Categorized tree with real-time balances, account badges, and 1-click standard seeding.
  2. **Vouchers & Journals**: Voucher register with type filters (`JV`, `PV`, `RV`, `CV`), status chips, and contextual actions (Print, Post, Reverse).
  3. **General Ledger (GL)**: Account selection dropdown, period dates, opening balance, debit/credit table, and dynamic running balance.
  4. **Cash & Bank Books**: Fast toggle between physical cash and commercial bank registers.
  5. **Trial Balance (TB)**: Full debit vs credit statement with green balance verification alert ($\text{Difference} = 0.00$).
  6. **Financial Statements**:
     - *Profit & Loss*: Revenue, COGS, Gross Profit, Operating Expenses, and Net Profit.
     - *Balance Sheet*: Assets, Liabilities, Equity, and $\text{Assets} = \text{Liabilities} + \text{Equity}$ equilibrium check.
- **Modals**:
  - *New Double-Entry Voucher*: Interactive line grid with real-time Dr/Cr summation and bold balance indicator. Disables submit until balanced.
  - *Add Custom Account*: Code, name, classification type, subtype, and opening balance.
  - *Printable Accounting Voucher*: Official voucher with dual Dr/Cr columns, narration, and 4-tier signature blocks (Prepared By, Checked By, Accounts Manager, Approved By).

## 11. Reports & analytics
- **Real-Time Trial Balance**: Guarantees accounting integrity across all factory transactions.
- **Profit & Loss Statement**: Performance audit tracking milling gross margins and overhead burdens.
- **Balance Sheet**: Certified statement of enterprise financial position.
- **General Ledger Audit**: Complete traceable audit trail for external auditors and tax authorities.

## 12. Automated tests
- **Service Unit Tests (`backend/src/modules/accounting/accounting.service.spec.ts`)**:
  - Seeding standard COA with 26+ industrial accounts.
  - Preventing duplicate account codes.
  - Validating and creating balanced double-entry vouchers.
  - Enforcing strict rejection when $\text{Total Debit} \ne \text{Total Credit}$.
  - Enforcing rejection on negative or malformed lines.
  - Posting draft journals and updating account running balances according to normal balance rules.
  - Reversing posted journals by swapping debits and credits.
  - Calculating General Ledger with opening balance, period movements, and running balance.
  - Generating Trial Balance and verifying $\sum \text{Debit} = \sum \text{Credit}$.
  - Generating Profit & Loss with Gross Profit and Net Profit calculations.
- **Controller Unit Tests (`backend/src/modules/accounting/accounting.controller.spec.ts`)**:
  - Verifying all 15 endpoints and RBAC permission metadata bindings.

## 13. Manual verification checklist
1. Log in as Chief Accountant or Accounts Officer.
2. Open **Accounting Engine** from navigation menu.
3. Click **Seed Standard COA** $\to$ 26+ accounts appear organized by Assets (1xxx), Liabilities (2xxx), Equity (3xxx), Revenue (4xxx), and Expenses (5xxx/6xxx).
4. Go to **Journal Vouchers** tab and click **New Voucher**, select `RECEIPT`.
5. Enter Line 1: `1010` (Cash in Hand), Dr: 50,000, Cr: 0.
   Enter Line 2: `4010` (Rice Sales Revenue), Dr: 0, Cr: 50,000.
6. Verify green banner displays: "✓ Balanced: Total Debit equals Total Credit".
7. Click **Post Voucher** $\to$ Voucher `RV-202611-0001` appears in table with `POSTED` badge.
8. Go to **General Ledger** tab, select `1010 - Cash in Hand` $\to$ Opening: 0, Debit: 50,000, Closing Balance: ৳ 50,000.
9. Go to **Trial Balance** tab $\to$ Total Debit: ৳ 50,000, Total Credit: ৳ 50,000, Difference: ৳ 0.00 (Balanced alert displayed).
10. Go to **Financial Statements** tab $\to$ P&L displays ৳ 50,000 Revenue and Net Profit; Balance Sheet displays ৳ 50,000 Assets = ৳ 50,000 Equity.
11. Click the **Print** icon on the voucher $\to$ Official printable voucher displays with signature seals.

