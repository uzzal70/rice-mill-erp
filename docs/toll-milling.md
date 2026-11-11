# Toll / Commercial Milling (#39)

## Status
Complete for Customer Paddy Receive, Gate Pass & Weighbridge Recording, Custody Inventory Tracking, Toll Milling Batch & Yield Calculations, Toll Delivery Challans, Service Fee Billing (Per KG, Per Mon, Per Bag), Customer Ledger Charges, and Bilingual Frontend Desk.

## 1. Business workflow
- **Purpose and actors**: Digitally manage third-party custom milling (Toll / Commercial Milling) where external clients (farmers, traders, or grain merchants) deliver raw paddy to the rice mill for processing into finished rice and by-products in exchange for a contracted service/conversion fee.
  - Primary actors: Weighbridge Operator, Store Officer, Mill Supervisor, Quality Inspector, Accounts Manager, and Factory Manager.
- **Preconditions and source documents**:
  - Customer registered in `Partner` table with `type: CUSTOMER`.
  - Registered Paddy Raw Material `Item` in catalog.
  - Designated processing line (`ProductionLine`) and storage stack or godown for incoming raw paddy and finished customer stock.
- **Key Tenet: Strict Separation of Custody Stock vs Company Owned Inventory**:
  - Customer-owned paddy, customer-owned finished rice, and customer-owned by-products are held in bailment/custody and **MUST NEVER** mix with company-owned stock or touch `StockMovement` (company inventory balance sheet assets).
  - Custody balances are tracked strictly within `TollOrder`, `TollBatch`, and `TollDelivery`.
- **States and transitions**:
  - `DRAFT`: Toll order created with agreed milling terms (service fee rate, rate basis, and by-product retention policy).
  - `RECEIVED`: Customer paddy has entered the mill premises via weighbridge gate pass; gross, tare, net weight, bag count, and moisture recorded. Custody paddy balance initialized.
  - `IN_PROCESS`: Paddy assigned to production line in one or more batches (`TollBatch`). Yields of finished rice, broken rice, husk, and bran are recorded.
  - `COMPLETED`: Milling batches complete, agreed finished rice and by-products delivered to customer via delivery challans (`TollDelivery`), and service fees finalized.
  - `CANCELLED`: Voided prior to milling processing.
- **Company/factory/location and ownership scope**:
  - Every toll order, milling batch, and delivery is strictly scoped to `companyId` and `factoryId`.
  - Cross-tenant or cross-factory references are rejected.

## 2. Database entities
- **`TollOrder`**:
  - `id`: CUID primary key.
  - `companyId`, `factoryId`: Multi-tenant and facility scoping.
  - `orderNumber`: Sequential unique code (e.g. `TOLL-202611-0001`).
  - `customerId`: Foreign key to `Partner`.
  - `paddyItemId`: Foreign key to raw paddy `Item`.
  - `status`: `TollOrderStatus` (`DRAFT`, `RECEIVED`, `IN_PROCESS`, `COMPLETED`, `CANCELLED`).
  - `rateBasis`: `TollRateBasis` (`PER_KG`, `PER_MON`, `PER_BAG`).
  - `serviceRate`: Negotiated service milling rate in BDT per unit basis.
  - `byProductPolicy`: `ByProductPolicy` (`RETURN_TO_CUSTOMER`, `MILL_RETENTION`).
  - `vehicleNumber`, `driverName`, `driverPhone`: Inbound transport details.
  - `truckWeightGrossKg`, `truckWeightTareKg`, `receivedBags`, `receivedNetKg`: Inbound weighbridge data.
  - `moisturePct`: Recorded paddy moisture at intake.
  - `processedKg`: Aggregate paddy milled across all batches.
  - `totalMillingCharge`: Total billing for milling services ($\text{processedKg} \times \text{rate}$ or equivalent).
  - `remarks`: Operational notes.
  - `createdById`, `approvedById`: User stamps.
  - Unique: `[companyId, orderNumber]`, `[companyId, factoryId, id]`.
  - Indexes: `[companyId, factoryId, status, createdAt]`, `[companyId, customerId, createdAt]`.
- **`TollBatch`**:
  - `id`: CUID primary key.
  - `companyId`, `factoryId`, `tollOrderId`.
  - `batchNumber`: Sequential unique batch number (e.g. `TB-202611-0001`).
  - `productionLineId`: Optional reference to `ProductionLine`.
  - `inputPaddyKg`: Net paddy consumed in this batch ($\le \text{receivedNetKg} - \text{priorProcessedKg}$).
  - `outputRiceKg`: Net prime finished rice yielded.
  - `brokenRiceKg`: Net broken rice yielded.
  - `huskKg`: Net rice husk yielded.
  - `branKg`: Net rice bran yielded.
  - `millingYieldPct`: Calculated total output recovery percentage.
  - `batchCost`: Service charge for this specific batch.
  - `startedAt`, `completedAt`: Processing timestamps.
  - `operatorName`, `notes`: Quality and supervisor tracking.
  - Unique: `[companyId, batchNumber]`.
  - Indexes: `[companyId, factoryId, tollOrderId]`.
- **`TollDelivery`**:
  - `id`: CUID primary key.
  - `companyId`, `factoryId`, `tollOrderId`.
  - `deliveryNumber`: Sequential unique delivery challan number (e.g. `TD-202611-0001`).
  - `gatePassNumber`: Sequential unique security gate pass code (e.g. `TGP-202611-0001`).
  - `deliveryDate`: Timestamp of outbound dispatch.
  - `riceBagsDelivered`, `riceKgDelivered`: Finished rice dispatched ($\le \text{custodyRiceBalance}$).
  - `byProductKgDelivered`: Dispatched by-products ($\le \text{custodyByProductBalance}$).
  - `vehicleNumber`, `driverName`, `driverPhone`: Outbound logistics details.
  - `remarks`: Security notes.
  - Unique: `[companyId, deliveryNumber]`, `[companyId, gatePassNumber]`.
  - Indexes: `[companyId, factoryId, tollOrderId]`.
- **Migration**: `0028_toll_milling`.

## 3. Relationships
- Parent/child:
  - `Company` (1) → `TollOrder` (N) → `TollBatch` (N)
  - `Company` (1) → `TollOrder` (N) → `TollDelivery` (N)
  - `Partner` (CUSTOMER) (1) → `TollOrder` (N)
  - `Item` (Paddy) (1) → `TollOrder` (N)
  - `ProductionLine` (1) → `TollBatch` (N) (optional)
- Retention: `ON DELETE RESTRICT` on all foreign key constraints.

## 4. Calculations
- **Inbound Net Weight**:
  $$\text{receivedNetKg} = \max(0, \text{truckWeightGrossKg} - \text{truckWeightTareKg})$$
- **Remaining Paddy in Custody (to process)**:
  $$\text{paddyRemainingKg} = \text{receivedNetKg} - \text{processedKg}$$
- **Batch Yield & Recovery Percentage**:
  $$\text{totalOutputKg} = \text{outputRiceKg} + \text{brokenRiceKg} + \text{huskKg} + \text{branKg}$$
  $$\text{millingYieldPct} = \text{round}\left(\frac{\text{totalOutputKg}}{\text{inputPaddyKg}} \times 100, 2\right)$$
- **Toll Service Fee**:
  $$\text{tollCharge} = \begin{cases}
  \text{round}(\text{processedKg} \times \text{serviceRate}, 2) & \text{basis} = \text{PER\_KG} \\
  \text{round}\left(\frac{\text{processedKg}}{40} \times \text{serviceRate}, 2\right) & \text{basis} = \text{PER\_MON} \\
  \text{round}(\text{receivedBags} \times \text{serviceRate}, 2) & \text{basis} = \text{PER\_BAG}
  \end{cases}$$
- **Custody Stock Balances**:
  $$\text{riceInCustodyKg} = \sum \text{outputRiceKg} - \sum \text{riceKgDelivered}$$
  $$\text{byProductInCustodyKg} = \sum (\text{brokenRiceKg} + \text{huskKg} + \text{branKg}) - \sum \text{byProductKgDelivered}$$
- **Customer Due Ledger Impact**:
  $$\text{totalCustomerDue} = \text{openingDue} + \sum \text{approvedSalesOrders} + \sum_{\text{IN\_PROCESS/COMPLETED}} \text{totalMillingCharge} - \sum \text{payments} - \sum \text{salesReturns}$$

## 5. Accounting impact
- Custody grain is off-balance sheet: no raw material or finished goods inventory asset journal entry is created.
- Billing generates pure Service Revenue:
  - **Debit**: Accounts Receivable — Customer Ledger (`Partner` balance)
  - **Credit**: Toll / Commercial Milling Service Revenue (Income Statement)
- Mill Retention of By-Products (when `byProductPolicy = MILL_RETENTION`):
  - Retained husk/bran retained by the mill in lieu of cash or as part of payment:
  - **Debit**: By-Product Inventory (Asset, at fair market value)
  - **Credit**: By-Product Recovery Revenue / Offset to Service Cost

## 6. Inventory impact
- Customer-owned paddy, rice, and by-products **do not** touch company `StockMovement` or company godown book values.
- Tracked strictly in memory and database via the Customer Custody Ledger:
  - Paddy Intake: increases custody paddy.
  - Milling Batch: decreases custody paddy, increases custody finished rice and custody by-products.
  - Toll Delivery Challan: decreases custody finished rice and custody by-products.
  - Order status automatically updates to `COMPLETED` when remaining paddy is 0 and remaining finished rice is 0.

## 7. API contract
- `POST /api/toll-milling`: Create new toll order (DRAFT or direct intake).
- `GET /api/toll-milling`: List toll orders with search, customer, status, and date filters.
- `GET /api/toll-milling/:id`: Get toll order details with batches, deliveries, and custody balances.
- `POST /api/toll-milling/:id/receive`: Record weighbridge gross/tare, bag count, and transition to `RECEIVED`.
- `POST /api/toll-milling/:id/batch`: Add milling batch, calculate yield recovery %, and update service billing.
- `POST /api/toll-milling/:id/deliver`: Generate delivery challan and gate pass, updating custody balance.
- `GET /api/toll-milling/custody-ledger`: Fetch comprehensive custody summary for all customers.

## 8. Access control & permissions
- Resource: `toll-milling`
- Required permissions:
  - `toll-milling:READ`: View orders, custody balances, and batch logs.
  - `toll-milling:CREATE`: Create toll orders.
  - `toll-milling:APPROVE`: Receive customer paddy and authorize intake.
  - `toll-milling:POST`: Execute milling batches and issue delivery challans/gate passes.
  - `toll-milling:UPDATE`: Update operational remarks.

## 9. Validation & edge cases
- **Multi-tenancy isolation**: Customer, paddy item, and production line must belong to caller's `companyId` and `factoryId`.
- **Negative weight rejection**: Gross weight must be strictly greater than tare weight ($\text{netKg} > 0$).
- **Over-consumption guard**: Milling batch `inputPaddyKg` cannot exceed unconsumed paddy custody balance.
- **Over-delivery guard**: Delivered finished rice and by-products cannot exceed available processed custody balances.
- **Zero rate handling**: Toll rates must be non-negative; rate basis must be one of `PER_KG`, `PER_MON`, `PER_BAG`.
- **By-Product policy compliance**: When `MILL_RETENTION` is selected, delivery of by-products to customer is restricted to 0 unless contract terms specify otherwise.

## 10. UI specifications
- Dedicated Desk at `frontend/src/app/toll-milling-page.tsx`.
- **Key components**:
  - Filter and KPI header: Total Orders, Paddy in Custody (KG), Rice in Custody (KG), and Total Service Revenue (BDT).
  - Main Tabs:
    1. **Toll Orders**: Table of all commercial milling orders with status badges, rate basis, and quick action buttons.
    2. **Custody Ledger**: Customer-by-customer breakdown of paddy deposited, milled, rice produced, delivered, and remaining in warehouse.
  - Modals:
    - *New Toll Order / Inbound Intake*: Complete vehicle, customer, paddy item, weighbridge gross/tare weights, moisture %, and billing rate basis.
    - *Log Milling Batch*: Input paddy weight, output finished rice, broken rice, bran, and husk with real-time recovery % display.
    - *Delivery Challan & Gate Pass*: Issue finished rice & by-product delivery, generating official security gate pass.
    - *Printable Service Invoice & Custody Report*: Printable dual document with QR/barcode placeholder, mill terms, recovery breakdown, and signature seals.

## 11. Reports & analytics
- **Toll Milling Custody Report**: Real-time statement of customer stock held inside the factory.
- **Milling Recovery Analysis**: Performance audit comparing milling yield % of customer paddy against standard auto/semi-auto rice mill benchmarks (65-72% total yield).
- **Service Revenue Register**: Monthly ledger of commercial milling fees billed, collected, and outstanding.

## 12. Automated tests
- Backend Service Tests (`backend/src/modules/toll-milling/toll-milling.service.spec.ts`):
  - Creating draft and received orders with accurate weighbridge net weight.
  - Rejecting invalid tenant items or customers.
  - Executing batches with yield recovery % calculation.
  - Guarding against over-processing input paddy.
  - Computing service fees across `PER_KG`, `PER_MON` (40 KG standard), and `PER_BAG`.
  - Issuing delivery challans and guarding against over-delivery.
  - Order auto-completion when all custody inventory is cleared.
  - Custody ledger summary computation.
- Controller Tests (`backend/src/modules/toll-milling/toll-milling.controller.spec.ts`):
  - Verifying endpoints and RBAC permission metadata bindings.

## 13. Manual verification checklist
1. Log in as Store / Weighbridge Operator.
2. Open **Toll / Commercial Milling** from navigation menu.
3. Click **New Toll Order**, select customer, paddy item, enter Gross: 15,000 KG, Tare: 5,000 KG (Net: 10,000 KG, 200 bags). Set rate: 2.50 BDT / KG.
4. Verify order appears as `RECEIVED` with 10,000 KG in custody.
5. Click **Add Batch**, input 6,000 KG paddy, 4,000 KG rice, 300 KG broken, 400 KG bran, 1,000 KG husk. Verify calculated yield = 95%.
6. Verify service charge updates to $6,000 \times 2.50 = 15,000$ BDT.
7. Click **Issue Delivery**, enter 3,500 KG rice delivered.
8. Verify Custody Ledger displays 500 KG finished rice remaining in warehouse custody.
9. Open **Print Invoice & Statement** and verify formal printable layout.

