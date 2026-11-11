# Dispatch & Challan (#37)

## Status
Complete for Delivery Challans, Security Gate Passes, Vehicle & Driver Capture, Weighbridge Net Weight Verification, Atomic Physical Stock Deductions via `StockMovement`, Sales Order Line Fulfillment Tracking, and Order Auto-Completion.

## 1. Business workflow
- **Purpose and actors**: Digitally manage the physical loading, verification, and dispatch of finished rice, broken rice, and by-products from mill warehouses. Generates official Delivery Challans and Security Gate Passes for transport vehicles. Primary actors: Warehouse Officer, Dispatch Officer, Weighbridge Operator, Security Guard, and Factory Manager.
- **Preconditions and source documents**:
  - Approved Sales Order (`SalesOrder` with `status: APPROVED`) scoped to the same company and factory.
  - Active stacks with physical unreserved stock of the ordered finished items.
  - Optional Weighbridge Gross and Tare weights (or manual net weight verification).
- **States and transitions**:
  - `DRAFT`: Initial challan creation with vehicle details, driver name & mobile, and proposed item/stack line quantities.
  - `APPROVED`: Supervisor authorization verifying product availability and delivery terms.
  - `POSTED`: Physical goods have passed the weighbridge/gate. Stock is atomically decremented (`StockMovementType.SALE`), `SalesOrderLine.fulfilledKg` is updated, and if all lines are satisfied, the parent `SalesOrder` transitions to `COMPLETED`.
  - `CANCELLED`: Unposted dispatch is voided; no inventory or fulfillment changes occur.
- **Approval, posting, cancellation, correction/reversal**:
  - Only `DRAFT` or `APPROVED` dispatches can be cancelled.
  - Once `POSTED`, dispatches are immutable. Reversals or returns must be handled via #38 Sales Return.
  - All workflow transitions write structured audit events (`AuditEvent`).
- **Company/factory/location and ownership scope**: Every dispatch is strictly bounded to `companyId` and `factoryId`. Customer, vehicle, sales order, item, and stack references must belong to the active company and factory. Cross-tenant references are rejected.

## 2. Database entities
- **`Dispatch`**:
  - `id`: CUID primary key.
  - `companyId`, `factoryId`: Tenant and facility scoping.
  - `salesOrderId`: Reference to the parent `SalesOrder`.
  - `customerId`: Reference to the receiving `Partner` (CUSTOMER).
  - `dispatchNumber`: Sequential identifier (e.g. `DSP-202611-0001`).
  - `challanNumber`: Official delivery challan number (e.g. `CH-202611-0001`).
  - `gatePassNumber`: Official security gate pass number (e.g. `GP-202611-0001`).
  - `status`: `DRAFT` | `APPROVED` | `POSTED` | `CANCELLED`.
  - `dispatchDate`: Timestamp of delivery.
  - `vehicleNumber`, `driverName`, `driverPhone`: Logistics details.
  - `grossWeightKg`, `tareWeightKg`, `netWeightKg`: Weighbridge readings.
  - `remarks`: Operational notes.
  - `createdById`, `approvedById`, `postedById`: User stamps.
  - `approvedAt`, `postedAt`, `createdAt`, `updatedAt`: Timestamps.
  - Unique constraints: `[companyId, dispatchNumber]`, `[companyId, challanNumber]`, `[companyId, factoryId, id]`.
  - Indexes: `[companyId, factoryId, status, dispatchDate]`, `[companyId, salesOrderId]`, `[companyId, customerId]`.
- **`DispatchLine`**:
  - `id`: CUID primary key.
  - `companyId`, `factoryId`, `dispatchId`.
  - `salesOrderLineId`: Reference to specific order line fulfilled.
  - `itemId`: Rice / by-product item dispatched.
  - `stackId`: Warehouse stack from which stock is physically pulled.
  - `bagCount`: Number of bags loaded.
  - `dispatchedKg`: Total physical kilograms dispatched.
  - Index: `[companyId, factoryId, itemId, stackId]`.
- **Migration**: `0026_sales_dispatch`.

## 3. Relationships
- Parent/child:
  - `Company` (1) → `Dispatch` (N) → `DispatchLine` (N)
  - `SalesOrder` (1) → `Dispatch` (N)
  - `SalesOrderLine` (1) → `DispatchLine` (N)
  - `Partner` (CUSTOMER) (1) → `Dispatch` (N)
  - `Item` (1) → `DispatchLine` (N)
  - `Stack` (1) → `DispatchLine` (N)
- Retention: `ON DELETE RESTRICT` on all foreign key constraints.

## 4. Calculations
- **Weighbridge Net Weight**:
  $$\text{netWeightKg} = \max(0, \text{grossWeightKg} - \text{tareWeightKg})$$
- **Total Dispatched Kilograms**:
  $$\text{totalDispatchedKg} = \sum \text{dispatchedKg}$$
- **Sales Order Line Remaining Unfulfilled**:
  $$\text{remainingKg} = \max(0, \text{SalesOrderLine.quantityKg} - \text{SalesOrderLine.fulfilledKg})$$
- **Sales Order Auto-Completion Condition**:
  An order transitions from `APPROVED` to `COMPLETED` when:
  $$\forall \text{line} \in \text{SalesOrderLine}: \text{fulfilledKg} \ge \text{quantityKg}$$

## 5. Accounting impact
- Physical dispatch marks the transfer of goods to the customer/carrier.
- In financial general ledger integration:
  - Cost of Goods Sold (COGS) is recognized:
    - **Debit**: Cost of Goods Sold (P&L expense account)
    - **Credit**: Finished Goods / By-Product Inventory Asset Account
  - Sales Invoicing (#35/Accounts) recognizes Accounts Receivable:
    - **Debit**: Customer Accounts Receivable (Asset)
    - **Credit**: Sales Revenue (P&L income account)
- Dispatch documents (Delivery Challan & Gate Pass) serve as the legal proof of delivery for tax, VAT, and audit compliance.

## 6. Inventory impact
- On Dispatch Posting (`POSTED`):
  - An atomic `StockMovement` row is created for each `DispatchLine`:
    - `type`: `StockMovementType.SALE`
    - `sourceType`: `'SALES_DISPATCH'`
    - `sourceId`: `dispatch.id`
    - `companyId`, `factoryId`, `itemId`, `stackId`
    - `quantity`: `-line.dispatchedKg` (negative quantity deducting stack stock)
  - Physical stock is verified inside a database transaction before deduction:
    $$\text{currentStackStock} \ge \text{dispatchedKg}$$
  - `SalesOrderLine.fulfilledKg` is incremented by `line.dispatchedKg`.
  - Because `availableUnreservedStock = physicalOnHand - (quantityKg - fulfilledKg)`, posting the dispatch reduces both physical on-hand and the active reservation equally, keeping the unreserved balance coherent.

## 7. API Endpoints
- `GET /dispatch`: List dispatches filtered by `companyId`, `factoryId`, `status`, `salesOrderId`, `customerId`.
- `GET /dispatch/:id`: Retrieve single dispatch with complete line details, parent sales order, and customer info.
- `POST /dispatch`: Create new dispatch in `DRAFT` status.
- `POST /dispatch/:id/approve`: Approve dispatch for warehouse loading.
- `POST /dispatch/:id/post`: Post dispatch, execute atomic stock movements, and increment order fulfillment.
- `POST /dispatch/:id/cancel`: Cancel draft or approved dispatch.

## 8. Permissions & RBAC
- `dispatch:READ`: Required for listing and viewing dispatches, challans, and gate passes.
- `dispatch:CREATE`: Required for drafting delivery challans and gate passes.
- `dispatch:APPROVE`: Required for approving dispatch authorizations.
- `dispatch:POST`: Required for posting goods out of the warehouse and executing inventory movements.
- `dispatch:UPDATE`: Required for cancelling or modifying draft dispatches.

## 9. Validation & Business rules
- **Parent Sales Order Status**: Parent order must have `status: APPROVED`. Dispatches against draft or cancelled orders are rejected.
- **Fulfillment Limits**: Dispatched kilograms cannot exceed unfulfilled quantity on the order line (`dispatchedKg <= quantityKg - fulfilledKg`). Over-dispatch requires updating or creating a new sales order.
- **Physical Stock Sufficiency**: The specified warehouse stack must have sufficient on-hand physical inventory (`onHand >= dispatchedKg`).
- **Logistics Integrity**: Vehicle number is mandatory. Driver mobile, when provided, must be valid.
- **Immutability**: Once a dispatch is `POSTED`, its lines, quantities, and logistics data cannot be edited.

## 10. UI/UX Design & Interactions
- Located under **OPERATIONS** → **Dispatch & Challan**.
- Real-time KPI summaries: Total Dispatches, Drafts, Approved, and Posted Challans.
- Create Dispatch modal:
  - Customer and approved Sales Order selector.
  - Logistics card: Vehicle Number, Driver Name, Driver Phone, Gross Weight, Tare Weight, and auto-computed Net Weight.
  - Multi-line item grid: Displays ordered item, stack selector, ordered KG, already fulfilled KG, remaining balance, bag count, and dispatch KG.
  - Auto-fills remaining balance with 1-click for convenience.
- Interactive Table: Filter by status, search by challan, gate pass, vehicle, or customer.
- **Bilingual Printable Delivery Challan Dialog**: Official commercial delivery document with company header, customer details, item specifications, bag counts, weight, and signature blocks.
- **Bilingual Printable Security Gate Pass Dialog**: Security document with vehicle number, driver details, gross/tare/net weighbridge verification, item count, gate pass stamp, and security sign-off.

## 11. Reports & Analytics
- Daily Delivery Challan register (vehicle, challan no, customer, total bags, total kg).
- Gate Pass security register for factory exits.
- Sales Order fulfillment status report (ordered vs dispatched vs pending balance).
- Warehouse outbound dispatch report grouped by godown, stack, and finished goods grade.

## 12. Test cases & Verification plan
- Unit tests in `backend/src/modules/dispatch/dispatch.service.spec.ts`:
  - `listDispatches`: Scoped by company and factory.
  - `createDispatch`: Rejects unapproved sales orders.
  - `createDispatch`: Rejects dispatch quantity exceeding remaining unfulfilled order balance.
  - `createDispatch`: Validates stack physical stock sufficiency.
  - `createDispatch`: Successfully creates `DRAFT` dispatch with sequential numbers.
  - `postDispatch`: Executes atomic `StockMovement` with `SALE` type and updates line fulfillment.
  - `postDispatch`: Auto-completes parent sales order when all lines are satisfied.
  - `cancelDispatch`: Cancels draft/approved dispatches.
- Controller tests in `backend/src/modules/dispatch/dispatch.controller.spec.ts`:
  - Verifies RBAC permissions on all endpoints.
- Verification: Run `npm --prefix backend run test` and `npm --prefix frontend run typecheck` & `build`.

