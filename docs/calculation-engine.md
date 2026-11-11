# Calculation Engine

## Status
Complete

## 1. Business workflow
- **Purpose and actors**:
  - The Calculation Engine is the central numerical computation kernel for the entire Rice Mill ERP.
  - In strict compliance with Promptdoc #63 (*"Do NOT place business calculations inside React components. Create backend services"*), all mathematical formulas, moisture deductions, landed cost overhead allocations, production mass balances, cost allocations, and margin analyses are isolated in backend services.
  - Primary actors include Mill Owners, Managing Directors, Head Millers, Weighbridge Operators, Laboratory QC Technicians, Accounts Managers, and Sales Executives.
- **Preconditions and source documents**:
  - Inputs originate from certified operational documents: Weighbridge Gross/Tare Tickets, Laboratory Moisture & QC Slips, Purchase Invoices, Utility Bills, Production Batch Logs, and Sales Invoices.
- **States and transitions**:
  - Pure calculation services operate deterministically. Calculations execute synchronously for validation, previewing, and transactional persistence.
- **Approval, posting, cancellation, correction/reversal**:
  - Computed values are stored as immutable snapshots in operational transaction headers and line items (e.g. `GoodsReceipt`, `PurchaseInvoice`, `ProductionBatch`, `SalesOrder`).
- **Company/factory/location and ownership scope**:
  - Calculations respect company-specific unit conversion graphs (e.g., 1 MON = 40 KG, 1 TON = 1000 KG) and factory-specific milling overhead allocations.

## 2. Database entities
The Calculation Engine feeds into and reads from:
- `WeighbridgeTicket`: `grossWeight`, `tareWeight`, `netWeight`
- `QualitySample`: `moisture`, `deductionKg`
- `PurchaseOrder` & `PurchaseInvoice`: `rate`, `quantity`, `subtotal`, `deductions`, `totalAmount`
- `LandedCost`: `directCosts`, `landedCostPerKg`
- `ProductionBatch` & `ProductionOutput`: `paddyInputKg`, `headRiceKg`, `brokenRiceKg`, `branKg`, `huskKg`, `processLossKg`
- `BatchProfitability`: `millingCost`, `byProductOffset`, `netCost`, `profitMargin`

## 3. Relationships
- Calculation services are stateless pure computation providers consumed across:
  - `ProcurementModule`
  - `ProductionModule`
  - `InventoryModule`
  - `SalesModule`
  - `AccountingModule`
  - `TollMillingModule`
  - `ProfitabilityModule`

## 4. Calculations
Full coverage across all 14 required business calculation services:

1. `calculateNetWeight(gross, tare, bagCount, bagTare, deductions)`:
   $$\text{Total Tare} = \text{Tare} + (\text{Bag Count} \times \text{Bag Tare}) + \text{Deductions}$$
   $$\text{Net Weight} = \text{Gross} - \text{Total Tare}$$
2. `calculateMoistureDeduction(weight, moisture, baseMoisture, deductionFactor)`:
   $$\text{Excess \%} = \max(0, \text{Moisture} - \text{Base Moisture})$$
   $$\text{Deduction KG} = \text{Weight} \times \frac{\text{Excess \%} \times \text{Deduction Factor}}{100}$$
3. `calculateAdjustedQuantity(actualWeight, moistureDeduction, foreignMatterDeduction, otherDeductions)`:
   $$\text{Payable Weight} = \max(0, \text{Actual Weight} - (\text{Moisture} + \text{FM} + \text{Other}))$$
4. `calculatePurchaseCost(payableWeight, rate, bagCount, bagRate, labor, deductions)`:
   $$\text{Total Cost} = (\text{Payable Weight} \times \text{Rate}) + (\text{Bag Count} \times \text{Bag Rate}) + \text{Labor} - \text{Deductions}$$
5. `calculateLandedCost(purchaseCost, transport, loading, unloading, brokerage, insurance, directCosts)`:
   $$\text{Total Landed} = \text{Purchase Cost} + \sum \text{Direct Overheads}$$
   $$\text{Cost / KG} = \frac{\text{Total Landed}}{\text{Payable Weight}}, \quad \text{Cost / Mon} = \text{Cost / KG} \times 40$$
6. `calculateProductionRecovery(paddyInputKg, outputs)`:
   $$\text{Total Output} = \text{Head Rice} + \text{Broken Rice} + \text{Bran} + \text{Husk} + \text{Waste}$$
   $$\text{Process Loss} = \max(0, \text{Paddy Input} - \text{Total Output})$$
   $$\text{Head Rice Recovery \%} = \frac{\text{Head Rice}}{\text{Paddy Input}} \times 100$$
   $$\text{Total Rice Recovery \%} = \frac{\text{Head Rice} + \text{Broken Rice}}{\text{Paddy Input}} \times 100$$
   $$\text{By-Product Recovery \%} = \frac{\text{Bran} + \text{Husk}}{\text{Paddy Input}} \times 100$$
7. `calculateByProductValue(byProducts)`:
   $$\text{Total By-Product Value} = \sum (\text{Quantity} \times \text{Market Rate / KG})$$
8. `calculateProductionCost(paddyCost, electricity, labor, boilerFuel, machineDepreciation, packing, byProductOffset)`:
   $$\text{Gross Cost} = \text{Paddy Cost} + \sum \text{Milling Overheads}$$
   $$\text{Net Cost} = \max(0, \text{Gross Cost} - \text{By-Product Offset})$$
9. `calculateRiceCost(netProductionCost, headRiceKg, brokenRiceKg, brokenRatio)`:
   $$\text{Effective Weight} = \text{Head Rice} + (\text{Broken Rice} \times \text{brokenRatio})$$
   $$\text{Head Rice Cost / KG} = \frac{\text{Net Cost}}{\text{Effective Weight}}$$
   $$\text{Broken Rice Cost / KG} = \text{Head Rice Cost / KG} \times \text{brokenRatio}$$
10. `calculateSalesProfit(revenue, COGS, delivery, commission, discounts, tax)`:
    $$\text{Net Revenue} = \text{Revenue} - \text{Discounts} - \text{Commission}$$
    $$\text{Gross Profit} = \text{Net Revenue} - \text{COGS}$$
    $$\text{Net Operating Profit} = \text{Gross Profit} - \text{Delivery} - \text{Tax}$$
11. `calculateSupplierDue(invoiced, settled, debitNotes, advances)`:
    $$\text{Net Payable Due} = (\text{Invoiced} - \text{Debit Notes}) - (\text{Settled} + \text{Advances})$$
12. `calculateCustomerDue(invoiced, settled, creditNotes, advances)`:
    $$\text{Net Receivable Due} = (\text{Invoiced} - \text{Credit Notes}) - (\text{Settled} + \text{Advances})$$
13. `calculateTollCharge(paddyMilledKg, millingRate, byProductRetentionValue, packaging, handling)`:
    $$\text{Net Toll Payable} = (\text{Paddy} \times \text{Rate}) + \text{Packaging} + \text{Handling} - \text{By-Product Retention}$$
14. `calculatePackagingCost(bagCount, bagUnitPrice, twineCost, printingCost, linerCost)`:
    $$\text{Cost / Bag} = \text{Bag Price} + \text{Twine} + \text{Printing} + \text{Liner}$$
    $$\text{Total Packaging Cost} = \text{Bag Count} \times \text{Cost / Bag}$$

## 5. Accounting impact
- Guarantees exact decimal precision ($0.01$ currency rounding, $0.0001$ rate rounding) to prevent penny rounding drift in double-entry ledgers.
- By-product revenue offset directly credits the milling work-in-progress (WIP) ledger.

## 6. Inventory impact
- Validates mass conservation on physical grain movements.
- Calculates physical and payable quantities before inventory movements are written to `StockMovement`.

## 7. API
All calculations are exposed via REST API endpoints under `/calculations/`:
- `POST /calculations/net-weight`
- `POST /calculations/moisture-deduction`
- `POST /calculations/adjusted-quantity`
- `POST /calculations/purchase-cost`
- `POST /calculations/landed-cost`
- `POST /calculations/production-recovery`
- `POST /calculations/by-product-value`
- `POST /calculations/production-cost`
- `POST /calculations/rice-cost`
- `POST /calculations/sales-profit`
- `POST /calculations/supplier-due`
- `POST /calculations/customer-due`
- `POST /calculations/toll-charge`
- `POST /calculations/packaging-cost`

## 8. Permissions
- Open for authenticated internal operations and batch transaction processing.

## 9. Validation
- DTO validation via `class-validator` enforces non-negative numbers (`@Min(0)`), realistic weight limits, and positive divisors.
- Gross weight must strictly exceed total tare weight.
- Divisors (e.g. paddy input weight, effective rice weight) cannot be zero.

## 10. UI
- `CalculationEnginePage` (`frontend/src/app/calculation-engine-page.tsx`):
  - Tab 0: Benchmark Recovery (#64) interactive simulation
  - Tab 1: Procurement & Landed Cost calculator
  - Tab 2: Production & Rice Costing allocation
  - Tab 3: Complete 14 Industrial Calculation Engines Catalog with formulas and verification status

## 11. Reports
- Direct calculations power Production Reports, Landed Cost Sheets, Lot Costing Statements, and Counterparty Statements.

## 12. Tests
- `calculation-engine.service.spec.ts`: 15 unit tests covering all 14 functions.
- `calculation-engine.controller.spec.ts`: Unit tests verifying REST endpoint routing.
- `production-recovery.spec.ts`: Benchmark test suite verifying promptdoc #64 mass balance.

## 13. Known limitations & Next steps
- Advanced multi-grade grain blending algorithms can be integrated for premium aromatic rice export lines.

