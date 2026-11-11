# 51. OWNER DASHBOARD

## Status
Complete

## 1. Business workflow
- **Purpose and actors**: Provides mill owners, managing directors, and executive leadership with an executive pulse of factory operations and financial health. Actors: Company Owners, Managing Directors, Chief Operating Officers, Plant Directors.
- **Preconditions and source documents**: Relies on operational and financial records generated within the day and cumulative balances from posted journals, GRNs, sales orders, production batches, and weighbridge gate tickets.
- **States and transitions**: Real-time aggregation of today's movements:
  - Today's Paddy Purchase (KG & BDT value) from approved Purchase Orders.
  - Today's Paddy Received (KG) from physical Goods Receipts.
  - Today's Milling Production (KG input) and Rice Output (KG finished goods) from Production Batches.
  - Today's Sales (KG & BDT total) from Sales Orders.
  - Today's Collections (BDT) from customer receivable payment journals (credits to Accounts Receivable).
  - Today's Expenses (BDT) from operational Expense vouchers.
  - Today's Estimated Gross & Net Profit.
- **Approval, posting, cancellation, correction/reversal**: Executive telemetry read-only surface reflecting posted ledger journals and recorded transactions.
- **Company/factory/location and ownership scope**: Multi-tenant isolation by `companyId` with optional scoping to specific factories via `factoryId`.

## 2. Database entities
- Uses existing core entities without requiring artificial duplicates:
  - `PurchaseOrder` (`orderedQuantity`, `unitRate`, `totalAmount`)
  - `GoodsReceipt` (`lines`, `acceptedQuantity`)
  - `ProductionBatch` (`inputQuantityKg`, `outputs`, `outputQuantityKg`)
  - `SalesOrder` (`lines`, `quantityKg`, `totalAmount`)
  - `Journal` & `JournalLine` (`accountCode` '1050', '1030', `credit`, `voucherDate`)
  - `Expense` (`totalAmount`, `expenseDate`, `status`)
  - `StockMovement` (aggregated by item category: Paddy, Rice, Broken, Bran, Husk, Packaging)
  - `Account` (`cash`, `bank`, `AR`, `AP`)
  - `Vehicle`, `VehicleTrip`, `GateEntry`, `ApprovalRequest`.
- Migration: Built upon existing schema; no new table required for aggregation.

## 3. Relationships
- Parent/child: Scoped to `Company` and `Factory`.
- Aggregates data seamlessly across Procurement (#17, #18), Gate & Weighbridge (#19-#22), Production (#24-#26), Sales & Dispatch (#27, #35), Expense (#39), and Accounting (#40-#43).

## 4. Calculations
- **Paddy Purchase (KG & BDT)**: $\sum (\text{orderedQuantity})$, $\sum (\text{orderedQuantity} \times \text{unitRate})$.
- **Paddy Received (KG)**: $\sum (\text{acceptedQuantity})$.
- **Production (KG)**: $\sum (\text{inputQuantityKg})$.
- **Rice Output (KG)**: $\sum (\text{outputQuantityKg})$ where item kind = `RICE`.
- **Sales (KG & BDT)**: $\sum (\text{salesLine.quantityKg})$, $\sum (\text{totalAmount})$.
- **Collections (BDT)**: $\sum (\text{credit})$ on receivable accounts (code `1050`, `1030`) for posted journals today.
- **Expenses (BDT)**: $\sum (\text{totalAmount})$ on expenses dated today.
- **Estimated Gross Profit**: $\text{Sales} - (\text{Sales} \times 0.85 \text{ estimated COGS})$.
- **Estimated Net Profit**: $\text{Gross Profit} - \text{Expenses}$.
- **Stock by Category**: Paddy, Rice, Broken rice, Bran, Husk, Packaging bag count.
- **Finance Balances**: Cash in Hand (1010), Bank Balances (1020), Accounts Receivable (1050), Accounts Payable (2010).

## 5. Accounting impact
- Read-only real-time aggregation of posted general ledger balances (`JournalLine` credit/debit totals) and cash/bank accounts. No automated posting triggers directly from dashboard views.

## 6. Inventory impact
- Real-time stock summation by item kind and byproduct type, accurately segmenting raw paddy from finished rice, broken grain, bran, and packaging units.

## 7. API
- `GET /dashboard/owner?companyId=<id>&factoryId=<optional>`:
  - Returns `{ today, stock, finance, operations }`.
  - Roles: Requires `reports:READ` permission.

## 8. Permissions
- Requires `reports:READ` authorized role. Strictly company-scoped and factory-filtered.

## 9. Validation
- `OwnerDashboardQueryDto`: `companyId` validated as non-empty string; `factoryId` optional string checked against tenant boundaries.

## 10. UI
- `frontend/src/app/owner-dashboard-page.tsx`:
  - 8 KPI cards for Today's Operational Pulse.
  - 6 Stock Category Meters (Paddy, Rice, Broken, Bran, Husk, Packaging).
  - 4 Treasury & Balance items (Cash, Bank, Customer Due, Supplier Due).
  - 5 Operational Health indicators (Fleet & Trips, Pending Quality, Pending Approvals, Active Batches, Low Stock items).
  - Bilingual support (English & Bengali).
  - Integrated into main `DashboardPage` with executive tabs.

## 11. Reports
- Direct dashboard exportable summary and real-time live telemetry view.

## 12. Tests
- `backend/src/modules/dashboard/dashboard.service.spec.ts`: Unit tests verifying calculation of today's purchases, production output, sales, collections, expenses, stock breakdown, and treasury balances.
- `backend/src/modules/dashboard/dashboard.controller.spec.ts`: Controller delegation tests.
- 100% test pass rate.

## 13. Audit & Compliance
- System access and query events audited under standard report inspection.

