# 43. Financial Reports Specification & Implementation Guide

## 1. Business Workflow
Financial reporting in a modern rice milling enterprise provides full operational and fiduciary transparency to management, lenders, tax authorities, and auditors. The reporting engine consolidates transaction postings from gate intake, procurement, drying, parboiling, milling, packaging, dispatch, sales returns, expenses, and treasury.

The 14 core financial reports delivered in this module include:
1. **Cash Book**: Chronological debit/credit journal of all physical cash handlings.
2. **Bank Book**: Real-time register of all bank clearing accounts and deposits.
3. **General Ledger (GL)**: Complete transactional ledger for any individual or composite COA head with period opening, debits, credits, and continuous running balances.
4. **Supplier Ledger**: Sub-ledger of all trade payables, invoices, advances, and payment clearances.
5. **Customer Ledger**: Sub-ledger of customer credit limits, dispatched sales deliveries, returns, and payment settlements.
6. **Trial Balance**: Mathematical equilibrium verification ensuring $\sum \text{Debits} = \sum \text{Credits}$.
7. **Profit & Loss Statement (P&L)**: Operating Revenue, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, and Net Profit.
8. **Balance Sheet**: Comprehensive Statement of Financial Position ($\text{Assets} = \text{Liabilities} + \text{Equity}$).
9. **Cash Flow Statement**: Categorized cash generation and utilization across Operating, Investing, and Financing activities.
10. **Accounts Receivable (AR) Schedule**: Itemized list of all customer exposures.
11. **Accounts Payable (AP) Schedule**: Itemized list of all supplier dues.
12. **Due Aging Schedule**: Aging buckets (0-30, 31-60, 61-90, 90+ days) highlighting recovery risks and liquidity needs.
13. **Expense Report**: Itemized breakdown of direct vs indirect cost centers with percentage share.
14. **Income Report**: Itemized revenue report covering finished rice, by-products, and toll milling service fees.

## 2. Database Entities
- **Account**: Primary COA model holding head codes, names, classifications, and balances.
- **Journal**: Voucher record holding transaction date, voucher type, status, and company scope.
- **JournalLine**: Itemized line records holding accountId, debit, credit, partnerId, and narration.
- **Partner**: Customer and supplier entity for sub-ledger aggregation and aging calculations.

## 3. Relationships
- `Journal` $\to$ `JournalLine` (1:N)
- `JournalLine` $\to$ `Account` (N:1)
- `JournalLine` $\to$ `Partner` (N:1 optional)
- Period lines filter by `companyId`, `voucherDate`, and `status = POSTED`.

## 4. Calculations & Math
1. **Account Running Balance (Normal Balance Rule)**:
   - For Assets and Expenses:
     $$\text{Balance}_t = \text{Balance}_{t-1} + \text{Debit}_t - \text{Credit}_t$$
   - For Liabilities, Equity, and Revenues:
     $$\text{Balance}_t = \text{Balance}_{t-1} + \text{Credit}_t - \text{Debit}_t$$
2. **Profit & Loss Metrics**:
   $$\text{Gross Profit} = \text{Total Operating Revenue} - \text{COGS}$$
   $$\text{Gross Margin \%} = \frac{\text{Gross Profit}}{\text{Total Revenue}} \times 100$$
   $$\text{Net Profit} = \text{Gross Profit} - \text{Operating Expenses}$$
   $$\text{Net Margin \%} = \frac{\text{Net Profit}}{\text{Total Revenue}} \times 100$$
3. **Balance Sheet Equilibrium**:
   $$\text{Total Assets} = \text{Total Liabilities} + (\text{Share Capital} + \text{Prior Retained Earnings} + \text{Current Year Net Profit})$$
4. **Cash Flow Indirect Method**:
   $$\text{Operating Cash Flow} = \text{Net Profit} - \Delta \text{AR} - \Delta \text{Inventory} + \Delta \text{AP}$$
   $$\text{Net Cash Change} = \text{Operating Cash} + \text{Investing Cash} + \text{Financing Cash}$$
5. **Aging Bucketing**:
   $$\text{Age in Days} = \left\lfloor \frac{\text{Current Date} - \text{Voucher Date}}{86400 \times 1000} \right\rfloor$$
   - 0 to 30 days: Current
   - 31 to 60 days: 30-day bucket
   - 61 to 90 days: 60-day bucket
   - 90+ days: Overdue / Default Risk

## 5. Accounting Impact
- All reports read directly from posted, immutable double-entry journal lines.
- Unposted draft vouchers are strictly excluded to preserve GAAP/IFRS integrity.
- Real-time mathematical equilibrium verification on Trial Balance and Balance Sheet prevents undisclosed discrepancies.

## 6. Inventory Impact
- Reflects raw paddy, finished rice, and by-product inventory valuation movements in working capital adjustments within the Cash Flow and Balance Sheet.

## 7. API Endpoints
All endpoints protected under `accounting:VIEW_FINANCIAL` permission:
- `GET /accounting/reports/gl?companyId=...&accountId=...&fromDate=...&toDate=...`
- `GET /accounting/reports/cash-book?companyId=...&fromDate=...&toDate=...`
- `GET /accounting/reports/bank-book?companyId=...&fromDate=...&toDate=...`
- `GET /accounting/reports/trial-balance?companyId=...&asOfDate=...`
- `GET /accounting/reports/pnl?companyId=...&fromDate=...&toDate=...`
- `GET /accounting/reports/balance-sheet?companyId=...&asOfDate=...`
- `GET /accounting/reports/sub-ledger/:partnerId?companyId=...`
- `GET /accounting/reports/cash-flow?companyId=...&fromDate=...&toDate=...`
- `GET /accounting/reports/ar?companyId=...`
- `GET /accounting/reports/ap?companyId=...`
- `GET /accounting/reports/due-aging?companyId=...&type=RECEIVABLE|PAYABLE`
- `GET /accounting/reports/income-expense?companyId=...&fromDate=...&toDate=...`

## 8. Permissions
- Required permission: `accounting:VIEW_FINANCIAL` for access to financial reports.

## 9. Validation
- Date range validation (`fromDate` $\le$ `toDate`).
- As-of-date defaults to current timestamp if omitted.
- Balanced ledger guards: alerts if Trial Balance or Balance Sheet diff $> 0.05$.

## 10. UI & Frontend Desk
- Integrated into the **Financial Statements** tab in `frontend/src/app/accounting-page.tsx`.
- Five sub-view toggle buttons:
  1. Profit & Loss Statement
  2. Balance Sheet
  3. Cash Flow Statement
  4. Accounts Receivable (AR Aging Schedule)
  5. Accounts Payable (AP Aging Schedule)
- Color-coded aging brackets: Green (Current), Amber (31-60d), Orange (61-90d), Red (90+d overdue).
- Official KPI cards and print preview support.

## 11. Reports & Analytical Insights
- Real-time cash generation breakdown.
- Credit risk exposure highlighting customers exceeding credit limits or aging beyond 90 days.
- Payables liability tracking for cash management and supplier relationship preservation.

## 12. Tests
- Unit tests in `backend/src/modules/accounting/accounting.service.spec.ts`:
  - `getGeneralLedger`: opening balance, period debit/credit, running balances.
  - `getTrialBalance`: mathematical debit/credit equilibrium check.
  - `getProfitAndLoss`: gross profit, COGS, operating expenses, net profit margins.
  - `getCashFlow`: indirect cash flow calculation across operations, investing, and financing.
  - `getAccountsReceivableReport` & `getDueAgingReport`: aging bucket allocations and totals.
  - Controller RBAC permission enforcement in `accounting.controller.spec.ts`.
- All tests passing (100%).

## 13. Implementation Details
- Backend Service: `backend/src/modules/accounting/accounting.service.ts`
- Backend Controller: `backend/src/modules/accounting/accounting.controller.ts`
- Frontend UI: `frontend/src/app/accounting-page.tsx`
- Tests: `backend/src/modules/accounting/accounting.service.spec.ts`

