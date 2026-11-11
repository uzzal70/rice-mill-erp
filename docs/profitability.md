# 44. Profitability Engine Specification & Implementation Guide

## 1. Business Workflow
In industrial rice milling, raw paddy procurement costs, moisture deductions, and variable processing expenses must be accurately reconciled against finished head rice, broken rice, husk, and bran yields to establish true cost of production and margin realization.

The Profitability Engine calculates dynamic, multi-dimensional profitability across:
1. **Per Production Batch**: Source paddy consumption + processing + labour + electricity + packaging + transport + factory overhead - by-product credits = Net Rice Cost.
2. **Per Unit Measures**: Cost per KG, Cost per Mon (40 KG standard), and Cost per Ton (1000 KG standard).
3. **Per Purchase / Paddy Lot**: Landed cost, moisture deductions, and milling yield value.
4. **Per Product & Brand**: Pricing realizations, unit manufacturing costs, and product-line profit contribution.
5. **Per Customer & Sales Invoice**: Dispatched delivery revenues against batch COGS.
6. **Per Factory**: Multi-mill operational efficiency and margin comparison.

## 2. Database Entities
- **BatchProfitability**:
  - `id`: Unique identifier (CUID)
  - `companyId`, `factoryId`, `batchId`: Multi-tenant ownership and batch link
  - `batchNumber`: Unique batch code
  - `paddyCost`: Raw material consumption value
  - `processingCost`: Machine processing expense
  - `labourCost`: Direct wage allocation
  - `electricityCost`: Power / fuel consumption
  - `packagingCost`: Bag and stitching expenses
  - `transportCost`: Material movement freight
  - `overheadCost`: Factory administrative allocation
  - `byProductRevenue`: Credit offset from husk, bran, and broken yields
  - `netRiceCost`: True cost of milled head rice
  - `finishedRiceKg`: Output volume
  - `costPerKg`, `costPerMon`, `costPerTon`: Standardized unit cost metrics
  - `projectedRevenue`: Sales realization expectation
  - `grossProfit`: Projected revenue minus net rice cost
  - `grossMarginPct`: Margin percentage

## 3. Relationships
- `BatchProfitability` $\to$ `Company` & `Factory` (N:1)
- `BatchProfitability` $\to$ `ProductionBatch` (1:1 unique relation with `@@unique([companyId, factoryId, batchId])`)

## 4. Calculations & Math
1. **Net Rice Cost Formula**:
   $$\text{Gross Batch Cost} = \text{Paddy Cost} + \text{Processing} + \text{Labour} + \text{Electricity} + \text{Packaging} + \text{Transport} + \text{Overhead}$$
   $$\text{By-Product Revenue Offset} = \sum (\text{ByProduct Quantity KG} \times \text{ByProduct Unit Rate})$$
   $$\text{Net Rice Cost} = \max(0, \text{Gross Batch Cost} - \text{By-Product Revenue Offset})$$

2. **Standard Industrial Unit Cost Rates**:
   $$\text{Cost per KG} = \frac{\text{Net Rice Cost}}{\text{Finished Rice Output KG}}$$
   $$\text{Cost per Mon} = \text{Cost per KG} \times 40$$
   $$\text{Cost per Ton} = \text{Cost per KG} \times 1000$$

3. **Profit & Margin Realization**:
   $$\text{Projected Revenue} = \text{Finished Rice Output KG} \times \text{Rice Sales Rate per KG}$$
   $$\text{Gross Profit} = \text{Projected Revenue} - \text{Net Rice Cost}$$
   $$\text{Gross Margin \%} = \left(\frac{\text{Gross Profit}}{\text{Projected Revenue}}\right) \times 100$$

## 5. Accounting Impact
- Integrates with General Ledger Cost of Goods Sold (5010) and inventory valuation accounts (1070 Finished Goods, 1080 By-Products).
- Establishes audited base rates for inventory balance sheet valuation.

## 6. Inventory Impact
- Converts physical mass-balance recoveries into granular financial unit costs per warehouse stack.

## 7. API Endpoints
All protected by `production:VIEW_FINANCIAL`:
- `POST /profitability/batches/calculate`: Calculate and save/update batch costing and profitability.
- `GET /profitability/batches/:batchId`: Retrieve profitability analysis for a specific batch.
- `GET /profitability/batches`: List batch profitabilities with filters.
- `GET /profitability/summary`: Multi-dimensional profitability summary by `BATCH`, `PURCHASE`, `PRODUCT`, `BRAND`, `CUSTOMER`, `FACTORY`.

## 8. Permissions
- Requires `production:VIEW_FINANCIAL` for reading and recalculating profitability models.

## 9. Validation
- Batch input quantity must be $> 0$.
- Non-negative validation on all direct and indirect cost inputs.
- Safe division guards: handles zero output volume gracefully without `NaN` or `Infinity`.

## 10. UI & Frontend Desk
- Built bilingual Profitability Desk (`frontend/src/app/profitability-page.tsx`).
- KPI Cards: Total Projected Revenue, Total Net Cost, Gross Profit, Average Margin %.
- 5 Multi-dimensional analysis tabs:
  1. Production Batches
  2. Purchase Lots
  3. Products & Brands
  4. Customer Profitability
  5. Factory Performance
- Interactive Batch Costing Calculator Dialog with instant parameter tuning and live recalculation.

## 11. Reports & Analytical Insights
- Real-time margin benchmarks across paddy lots and finished rice brands.
- Identifies loss-making batches where by-product realization or milling yield dropped below break-even thresholds.

## 12. Tests
- Unit tests in `backend/src/modules/profitability/profitability.service.spec.ts`:
  - Accurate calculation of Net Rice Cost, Unit Rates (KG, Mon, Ton), and Gross Margin %.
  - Safe error handling for nonexistent batches.
  - Multi-dimensional aggregation for `BATCH` and `PURCHASE` lot dimensions.
- Controller RBAC permission tests in `profitability.controller.spec.ts`.
- 100% test pass rate (7/7 tests).

## 13. Implementation Details
- Schema Migration: `database/prisma/migrations/0031_profitability_engine`
- Service: `backend/src/modules/profitability/profitability.service.ts`
- Controller: `backend/src/modules/profitability/profitability.controller.ts`
- Module: `backend/src/modules/profitability/profitability.module.ts`
- UI Desk: `frontend/src/app/profitability-page.tsx`

