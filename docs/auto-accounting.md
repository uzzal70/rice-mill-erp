# 42. Automatic Accounting Specification & Implementation Guide

## 1. Business Workflow
Automatic Accounting is the event-driven accounting engine that translates physical and commercial operational events in the rice mill into balanced, auditable, double-entry general ledger journal entries without requiring manual bookkeeper intervention.

The automated workflow covers five critical business transitions:
1. **Paddy Purchase Invoices**: When a purchase invoice is verified and approved from gate weighbridge & quality deductions, the engine automatically debits *Raw Material Inventory (Paddy - 1060)* and credits *Accounts Payable (Trade Creditors - 2010)*.
2. **Sales Dispatches (Challans)**: When finished rice or by-products are weighed out and dispatched under an approved sales order, the engine debits *Accounts Receivable (Trade Debtors - 1050)* and credits *Sales Revenue (4010)*.
3. **Milling Production Conversions**: When paddy is consumed through parboiling, drying, and milling lines, the engine credits *Cost of Raw Paddy Consumed (5010)* and debits *Finished Goods Inventory (Rice - 1070)* and *By-Product Inventory (Husk, Bran, Broken - 1080)* according to standard yield recovery ratios.
4. **Customer Payment Receipts**: When money is received in cash or bank transfer, the engine debits *Cash in Hand (1010)* or *Bank Account (1020)* and credits *Accounts Receivable (1050)*.
5. **Supplier Disbursements**: When suppliers are paid, the engine debits *Accounts Payable (2010)* and credits *Cash in Hand (1010)* or *Bank Account (1020)*.

## 2. Database Entities
- **Journal**: Stores voucher header (`voucherType: PURCHASE | SALES | RECEIPT | PAYMENT | JOURNAL`, `number`, `voucherDate`, `totalAmount`, `status: POSTED`, `sourceType`, `sourceId`, `companyId`, `factoryId`, `partnerId`).
- **JournalLine**: Stores balanced entry debits and credits (`accountId`, `accountCode`, `partnerId`, `debit`, `credit`, `description`).
- **Account**: System and user Chart of Accounts holding running balance (`code`, `name`, `type`, `subtype`, `currentBalance`).

## 3. Relationships
- `Journal` $\to$ `Company` & `Factory` (1:N)
- `Journal` $\to$ `JournalLine` (1:N cascade)
- `JournalLine` $\to$ `Account` (N:1)
- `Journal` $\to$ `Partner` (optional customer/supplier linkage)
- Source Document Linkage: `[sourceType, sourceId]` has a unique composite constraint preventing double-posting.

## 4. Calculations & Math
1. **Double-Entry Equilibrium Rule**:
   $$\sum \text{Debit} = \sum \text{Credit} = \text{Total Amount}$$
2. **Sales Revenue Recognition**:
   $$\text{Revenue} = \sum (\text{Dispatched KG} \times \text{Sales Order Line Rate})$$
3. **Production Mass & Value Conservation**:
   $$\text{Total Milling Cost} = \text{Input Paddy KG} \times \text{Standard Paddy Cost Layer}$$
   $$\text{Finished Goods Debit (85\%)} = 0.85 \times \text{Total Cost}$$
   $$\text{By-Product Debit (15\%)} = 0.15 \times \text{Total Cost}$$
   $$\text{Total Debit} = \text{Finished Goods} + \text{By-Product} = \text{Total Milling Cost (Credit)}$$

## 5. Accounting Impact
All auto-accounting postings are immediate, balanced, and affect the real-time Trial Balance, General Ledger, Cash Book, and Financial Statements.
- Assets: Debit increases, Credit decreases
- Liabilities: Credit increases, Debit decreases
- Revenues: Credit increases, Debit decreases
- Expenses: Debit increases, Credit decreases

## 6. Inventory Impact
Auto-accounting reflects the financial valuation corresponding to inventory ledger movements:
- Purchase: Increases inventory valuation on Balance Sheet.
- Sales Dispatch: Matches physical inventory deduction with accounts receivable and revenue.
- Production: Converts Raw Material Asset into Finished Goods and By-Product Assets.

## 7. API Endpoints
Integrated into core transaction lifecycle hooks and `AccountingService`:
- Handled internally by `AutoAccountingService` within transaction boundaries (`Prisma.TransactionClient`).
- Querying auto-generated journals via standard `GET /accounting/vouchers?sourceType=PURCHASE|SALES|PRODUCTION|CUSTOMER_RECEIPT|SUPPLIER_PAYMENT`.

## 8. Permissions
- Auto-posting executes under elevated transaction scope triggered by users with respective operational posting permissions:
  - `procurement:POST`
  - `dispatch:POST`
  - `production:POST`
  - `accounting:CREATE`

## 9. Validation
- Zero or negative amount transactions are rejected from journal generation.
- Idempotency guard: `sourceType` and `sourceId` uniqueness prevents duplicate financial entries for the same physical event.
- Account resolution guard: auto-provisions standard COA accounts if not yet initialized in the company chart of accounts.

## 10. UI & Frontend Desk
- Auto-generated vouchers are immediately visible in the **Accounting Desk (`accounting-page.tsx`)** under the **Vouchers** and **General Ledger** tabs.
- Filterable by `PURCHASE`, `SALES`, `RECEIPT`, and `PAYMENT` voucher types.
- Printable Official 4-tier Accounting Voucher dialog with audit trail and account breakdown.

## 11. Reports & Analytical Insights
- Real-time updates to **Trial Balance**.
- Automatic update to **Cash Book** and **Bank Book**.
- Instant reflecting in **Supplier Ledger** and **Customer Statement**.
- Operating Revenue and COGS in **Profit & Loss Statement**.

## 12. Tests
- Unit tests implemented in `backend/src/modules/accounting/auto-accounting.service.spec.ts`:
  - `postPurchaseInvoice`: Verifies Dr Inventory, Cr Accounts Payable.
  - `postPurchaseInvoice`: Verifies zero/negative amount rejection.
  - `postSalesDispatch`: Verifies Dr AR, Cr Sales Revenue.
  - `postProductionBatch`: Verifies Dr Finished Goods, Dr By-products, Cr Raw Material Consumed.
  - `postCustomerReceipt`: Verifies Dr Cash/Bank, Cr AR.
  - `postSupplierPayment`: Verifies Dr AP, Cr Cash/Bank.
- Test pass rate: 100% (7/7 tests).

## 13. Implementation Details
- Service: `backend/src/modules/accounting/auto-accounting.service.ts`
- Module: `backend/src/modules/accounting/accounting.module.ts`
- Tests: `backend/src/modules/accounting/auto-accounting.service.spec.ts`

