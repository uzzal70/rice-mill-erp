# 52. MANAGEMENT ANALYTICS

## Status
Complete

## 1. Business workflow
- **Purpose and actors**: Provides strategic executive business intelligence, performance trends, profitability dynamics, and counterparty performance matrices for mill leadership. Actors: Managing Directors, Plant Heads, Chief Financial Officers, Commercial Directors.
- **Preconditions and source documents**: Computed from posted purchase orders, sales orders, milling batches, general ledger account lines, physical stock movements, and expenses across configurable horizons (7, 30, 90, 365 days).
- **States and transitions**: Analytical time-series aggregation and real-time KPI synthesis:
  - 8 Time-series trends: Paddy Purchase, Paddy Price, Rice Price, Production, Recovery %, Sales Revenue, Net Profit, Operating Expense.
  - Stock aging brackets: 0-30 Days, 31-60 Days, 61-90 Days, 90+ Days.
  - Counterparty rankings: Top suppliers by volume & rate, top customers by revenue & margin.
  - Strategic KPIs: Average Paddy Rate, Average Sales Rate, Average Recovery %, Cost/KG, Profit/KG, Gross Margin %, Stock Turnover, Working Capital.
- **Approval, posting, cancellation, correction/reversal**: Non-transactional analytical engine reflecting only verified and posted operational documents.
- **Company/factory/location and ownership scope**: Multi-tenant isolation by `companyId` with optional scoping to specific factories via `factoryId`.

## 2. Database entities
- Leverages existing normalized records:
  - `PurchaseOrder` (`orderedQuantity`, `unitRate`, `supplierId`, `createdAt`)
  - `SalesOrder` (`lines`, `quantityKg`, `totalAmount`, `customerId`, `createdAt`)
  - `ProductionBatch` (`inputQuantityKg`, `outputs`, `createdAt`)
  - `Expense` (`totalAmount`, `expenseDate`)
  - `StockMovement` (`quantity`, `occurredAt`)
  - `Account` (`code`, `journalLines`)
  - `Partner` (`name`, `type`)
- Migration: Built upon existing core database entities; no duplicate tables created.

## 3. Relationships
- Aggregates cross-functional operational records across Procurement (#17), Inventory (#23), Production (#26), Sales (#27), Expense (#39), and Accounting (#40).

## 4. Calculations
- **Average Paddy Rate**: $\frac{\sum (\text{orderedQuantity} \times \text{unitRate})}{\sum \text{orderedQuantity}}$.
- **Average Sales Rate**: $\frac{\sum \text{totalAmount}}{\sum \text{salesLine.quantityKg}}$.
- **Average Recovery Rate**: $\frac{\sum \text{outputRiceKg}}{\sum \text{inputPaddyKg}} \times 100$.
- **Cost / KG**: $\frac{\text{Total Paddy Cost} + \text{Total Operating Expenses}}{\text{Total Rice Output KG}}$.
- **Profit / KG**: $\text{Average Sales Rate} - \text{Cost / KG}$.
- **Gross Margin %**: $\frac{\text{Total Sales Revenue} - \text{COGS}}{\text{Total Sales Revenue}} \times 100$.
- **Stock Turnover**: Annualized sales velocity divided by average inventory value.
- **Working Capital**: $(\text{Cash} + \text{Bank} + \text{Accounts Receivable} + \text{Inventory Valuation}) - \text{Accounts Payable}$.
- **Stock Aging**: Days elapsed from `StockMovement.occurredAt` to current timestamp:
  - 0-30 Days: $\Delta t \le 30$
  - 31-60 Days: $30 < \Delta t \le 60$
  - 61-90 Days: $60 < \Delta t \le 90$
  - 90+ Days: $\Delta t > 90$

## 5. Accounting impact
- Read-only strategic analysis drawing directly from double-entry GL journal lines and balance sheets. Does not post journal entries.

## 6. Inventory impact
- Groups physical FIFO movement batches to analyze aging and slow-moving inventory to avoid capital tie-up and grain spoilage.

## 7. API
- `GET /dashboard/analytics?companyId=<id>&factoryId=<optional>&days=<7|30|90|365>`:
  - Returns `{ kpis, charts: { paddyPurchaseTrend, paddyPriceTrend, ricePriceTrend, productionTrend, recoveryTrend, salesTrend, profitTrend, expenseTrend, stockAging, supplierPerformance, customerProfitability } }`.
  - Roles: Requires `reports:READ` permission.

## 8. Permissions
- Requires `reports:READ` role with strict company boundary enforcement.

## 9. Validation
- `ManagementAnalyticsQueryDto`: Validates `companyId`, optional `factoryId`, and optional `days` integer string.

## 10. UI
- `frontend/src/app/management-analytics-page.tsx`:
  - 8 Strategic KPI Metric cards with color-coded top borders.
  - 8 Pure SVG Sparkline charts showing daily time series for purchases, prices, production, recovery, sales, profit, and expenses.
  - Stock aging visual cards with quantity and valuation.
  - Supplier performance ranking table.
  - Customer profitability ranking table with gross margin percentages.
  - Time horizon selector (Last 7 Days, Last 30 Days, Last 90 Days, Last 365 Days).
  - Bilingual English/Bengali labels.
  - Integrated into main Dashboard tabs and Management sidebar.

## 11. Reports
- Direct exportable view of executive business intelligence.

## 12. Tests
- `backend/src/modules/dashboard/dashboard.service.spec.ts`: Unit test validating all 8 KPI formulas and 11 chart series.
- `backend/src/modules/dashboard/dashboard.controller.spec.ts`: Controller routing tests.
- 100% test pass rate.

## 13. Audit & Compliance
- System access and analytics queries tracked under standard audit logging.

