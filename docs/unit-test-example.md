# Unit Test Example: Production Yield & Mass Balance Benchmark

## Status
Complete

## 1. Business workflow
- **Purpose and actors**:
  - The Unit Test Example module implements and verifies the production mass balance benchmark explicitly specified in Promptdoc #64:
    > *"Input Paddy: 4000 KG. Outputs: 2600 KG Head Rice, 300 KG Broken Rice, 500 KG Bran, 400 KG Husk, 100 KG Waste. System must calculate: Total Output, Process Loss, Head Rice Recovery, Total Rice Recovery, By-product Recovery. Do not assume 65% recovery. Calculate from actual transaction values."*
  - Primary actors include Head Millers, Production Supervisors, Quality Control Officers, Plant Managers, and Managing Directors.
- **Preconditions and source documents**:
  - Inbound raw material weight recorded from Weighbridge ticket or hopper scale reading.
  - Granular finished output weights recorded from automatic baggers and bagging scales.
- **States and transitions**:
  - Milling run initiates in `DRAFT` state $\to$ outputs recorded in `COMPLETED` state $\to$ yield calculation engine executes $\to$ mass balance verified $\to$ stock movements posted.
- **Approval, posting, cancellation, correction/reversal**:
  - If output mass exceeds input mass by $> 0.5\%$, system raises an anomaly alert (`UNUSUAL_PRODUCTION_LOSS` or `MASS_CREATION_ANOMALY`).
- **Company/factory/location and ownership scope**:
  - Scoped to active `Factory` and `ProductionLine`.

## 2. Database entities
- `ProductionBatch`: Stores `paddyInputKg`, `totalOutputKg`, `processLossKg`, `headRiceRecoveryPct`, `totalRiceRecoveryPct`, `byProductRecoveryPct`.
- `ProductionOutput`: Granular lines for each output fraction (`HEAD_RICE`, `BROKEN_RICE`, `BRAN`, `HUSK`, `WASTE`).
- `StockMovement`: Deducts input paddy from raw godown and adds finished outputs to respective godowns.

## 3. Relationships
- Linked to `PaddyItem` (input raw paddy variety), `RiceItem` (output head/broken rice), and `ByProduct` (bran, husk).
- Cross-module link to `ProductionLine`, `Machine`, and `BatchProfitability`.

## 4. Calculations
Verified against the canonical Promptdoc #64 test case:

| Component | Physical Weight | Mathematical Formula | Result Value |
| :--- | :--- | :--- | :--- |
| **Input Paddy** | **4,000.00 KG** | **Gross Input** | **4,000.00 KG** |
| Head Rice (প্রথম চাল) | 2,600.00 KG | $2600 / 4000 \times 100$ | **65.00%** |
| Broken Rice (খুদ) | 300.00 KG | $300 / 4000 \times 100$ | **7.50%** |
| **Total Rice Output** | **2,900.00 KG** | $(2600 + 300) / 4000 \times 100$ | **72.50%** |
| Rice Bran (কুড়া) | 500.00 KG | $500 / 4000 \times 100$ | **12.50%** |
| Husk (তুষ) | 400.00 KG | $400 / 4000 \times 100$ | **10.00%** |
| **Total By-Products** | **900.00 KG** | $(500 + 400) / 4000 \times 100$ | **22.50%** |
| Waste / Dust | 100.00 KG | $100 / 4000 \times 100$ | **2.50%** |
| **Total Recorded Output** | **3,900.00 KG** | $2600 + 300 + 500 + 400 + 100$ | **97.50%** |
| **Process Loss (ঘাটতি)** | **100.00 KG** | $4000 - 3900$ | **2.50%** |
| **Mass Balance Conservation** | **4,000.00 KG** | $\text{Output} + \text{Loss} = \text{Input}$ | **100.00% Balanced** |

Dynamic Calculation Principle:
- Standard default rules (like generic 65% head rice recovery) are never assumed.
- Ratios are derived dynamically from actual scale readings. A premium Miniket batch might yield 68.5% head rice, while a moisture-damaged or chalky grain batch might yield 58.0% head rice and 14.0% broken rice.

## 5. Accounting impact
- Finished goods inventory capitalization:
  - Head rice and broken rice capitalized based on relative net value allocation.
  - By-product value credited to work-in-progress (WIP).
- Unaccounted process loss exceeding tolerance threshold (typically $> 3.0\%$) triggers an abnormal loss write-off journal.

## 6. Inventory impact
- Raw Paddy stock decreased by 4,000 KG.
- Head Rice stock increased by 2,600 KG.
- Broken Rice stock increased by 300 KG.
- Bran stock increased by 500 KG.
- Husk stock increased by 400 KG.
- Waste (100 KG) and Process Loss (100 KG) accounted for in mass balance ledger.

## 7. API
- `POST /calculations/production-recovery`:
  - Request: `{ paddyInputKg: 4000, headRiceKg: 2600, brokenRiceKg: 300, branKg: 500, huskKg: 400, wasteKg: 100 }`
  - Response:
    ```json
    {
      "paddyInputKg": 4000,
      "totalOutputKg": 3900,
      "processLossKg": 100,
      "processLossPercent": 2.5,
      "headRiceRecoveryPercent": 65,
      "totalRiceRecoveryPercent": 72.5,
      "byProductRecoveryPercent": 22.5,
      "wastePercent": 2.5
    }
    ```

## 8. Permissions
- Production managers and millers require `production:CREATE` and `production:READ` permissions.

## 9. Validation
- `paddyInputKg` must be strictly positive (`@Min(0.01)`).
- Individual outputs cannot be negative.
- Sum of outputs cannot exceed input paddy plus allowable moisture expansion.

## 10. UI
- Dedicated interactive benchmark visualizer in `frontend/src/app/calculation-engine-page.tsx` (Tab 0).
- Users can test custom batch quantities or click "Reset to #64 Standard Example".

## 11. Reports
- Standard Daily Production Report and Recovery Variance Statement compare actual recoveries against standard variety baselines.

## 12. Tests
- Automated test suite: `backend/src/modules/calculations/production-recovery.spec.ts`.
- Validates:
  1. Exact Promptdoc #64 mass balance figures (3900 KG output, 100 KG loss, 65% head rice, 72.5% total rice, 22.5% by-product).
  2. Dynamic calculation for high-yield (68% head rice) and low-yield (56% head rice) batches.
  3. Rejection of zero or negative inputs.

## 13. Known limitations & Next steps
- Automatic optical sorter reject loop integration for multi-pass polishing lines.

