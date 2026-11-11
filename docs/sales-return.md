# Sales Return (#38)

## Status
Complete for Full Return, Partial Return, Damaged Return, Inventory Restocking, Customer Ledger & Credit Note Adjustment, Replacement Re-dispatch Fulfillment Tracking, and RBAC Audit Controls.

## 1. Business workflow
- **Purpose and actors**: Digitally manage the commercial and physical return of finished rice and by-products from customers across all trade channels (Wholesale, Retail, Dealer, Distributor, Institutional, Cash, Credit, Export). Primary actors: Store Officer, Quality Inspector, Accounts Manager, and Factory Manager.
- **Preconditions and source documents**:
  - Approved or fulfilled Sales Order (`SalesOrder` with `status: APPROVED` or `status: POSTED`).
  - Optional posted Delivery Challan (`Dispatch` with `status: POSTED`).
  - Active restock stacks in active factory godowns (prime stacks for intact goods, quarantine/damaged stacks for damaged returns).
- **Return Scenarios**:
  - `FULL`: Complete return of all delivered items from a dispatch challan or sales order.
  - `PARTIAL`: Return of a specified quantity of items.
  - `DAMAGED`: Return of defective, broken, infested, or off-spec goods requiring quarantine or write-off.
- **Settlement Types**:
  - `CREDIT_NOTE`: Generates a legal credit note adjusting the customer accounts receivable ledger and reducing net customer due.
  - `REPLACEMENT`: Rolls back `fulfilledKg` on the sales order lines, reopening completed orders to `APPROVED` so replacement goods can be re-dispatched.
  - `REFUND`: Direct cash/bank payout recorded against accounts payable/cash ledger.
- **States and transitions**:
  - `DRAFT`: Initial return voucher entry with reason, condition, and quantities.
  - `APPROVED`: Supervisor authorization verifying return validity, inspection results, and terms.
  - `POSTED`: Goods are received into the mill warehouse. Stock is atomically incremented (`StockMovementType.SALE_RETURN` for intact, `StockMovementType.DAMAGE` for damaged). Customer ledger is credited (reducing net exposure), and order fulfillment is rolled back if replacement is chosen.
  - `CANCELLED`: Voided prior to posting; cannot cancel once posted.
- **Company/factory/location and ownership scope**: Every return and credit note is strictly bounded to `companyId` and `factoryId`. Stacks, items, customers, orders, and dispatches must belong to the active company and factory. Cross-tenant references are strictly rejected.

## 2. Database entities
- **`SalesReturn`**:
  - `id`: CUID primary key.
  - `companyId`, `factoryId`: Tenant and facility scoping.
  - `salesOrderId`: Reference to parent `SalesOrder`.
  - `dispatchId`: Optional reference to specific `Dispatch` challan.
  - `customerId`: Reference to customer `Partner`.
  - `returnNumber`: Sequential unique return number (e.g. `RET-202611-0001`).
  - `creditNoteNumber`: Unique credit note voucher number (e.g. `CN-102938`).
  - `type`: `SalesReturnType` (`FULL` | `PARTIAL` | `DAMAGED`).
  - `settlement`: `SalesReturnSettlement` (`CREDIT_NOTE` | `REPLACEMENT` | `REFUND`).
  - `status`: `DocumentStatus` (`DRAFT` | `APPROVED` | `POSTED` | `CANCELLED`).
  - `returnDate`: Date of physical return.
  - `reason`: Detailed operational reason for return.
  - `totalBags`: Total bag count returned.
  - `totalWeightKg`: Total returned weight in KG.
  - `totalAmount`: Total credit value in BDT.
  - `remarks`: Operational notes.
  - `createdById`, `approvedById`, `postedById`: User stamps.
  - `approvedAt`, `postedAt`, `createdAt`, `updatedAt`: Timestamps.
  - Unique: `[companyId, returnNumber]`, `[companyId, creditNoteNumber]`, `[companyId, factoryId, id]`.
  - Indexes: `[companyId, factoryId, status, createdAt]`, `[companyId, customerId, createdAt]`, `[companyId, salesOrderId]`, `[companyId, dispatchId]`.
- **`SalesReturnLine`**:
  - `id`: CUID primary key.
  - `companyId`, `factoryId`, `salesReturnId`.
  - `salesOrderLineId`: Order line being returned.
  - `dispatchLineId`: Optional specific challan line being returned.
  - `itemId`: Rice or by-product item returned.
  - `restockStackId`: Target warehouse stack receiving the returned goods.
  - `condition`: `SalesReturnCondition` (`INTACT` | `DAMAGED`).
  - `bagCount`: Bag count for line.
  - `returnKg`: Net returned weight in KG.
  - `unitRate`: Transaction rate per KG.
  - `lineAmount`: Credit amount ($\text{returnKg} \times \text{unitRate}$).
  - `damageNotes`: Quality inspection notes if damaged.
  - Index: `[companyId, factoryId, itemId, restockStackId]`.
- **Migration**: `0027_sales_returns`.

## 3. Relationships
- Parent/child:
  - `Company` (1) → `SalesReturn` (N) → `SalesReturnLine` (N)
  - `SalesOrder` (1) → `SalesReturn` (N)
  - `Dispatch` (1) → `SalesReturn` (N) (optional)
  - `Partner` (CUSTOMER) (1) → `SalesReturn` (N)
  - `SalesOrderLine` (1) → `SalesReturnLine` (N)
  - `DispatchLine` (1) → `SalesReturnLine` (N) (optional)
  - `Item` (1) → `SalesReturnLine` (N)
  - `Stack` (1) → `SalesReturnLine` (N)
- Retention: `ON DELETE RESTRICT` on all foreign key constraints.

## 4. Calculations
- **Line Amount**:
  $$\text{lineAmount} = \text{round}(\text{returnKg} \times \text{unitRate}, 2)$$
- **Return Total Amount**:
  $$\text{totalAmount} = \sum \text{lineAmount}$$
- **Return Weight Total**:
  $$\text{totalWeightKg} = \sum \text{returnKg}$$
- **Return Quantity Limit**:
  $$\text{returnKg} \le \text{dispatchedKg (or line.fulfilledKg)}$$
- **Customer Ledger Impact**:
  $$\text{totalDue} = \text{openingDue} + \sum \text{approvedOrders} - \sum \text{payments} - \sum_{\text{POSTED}} \text{salesReturns}$$
  $$\text{availableCredit} = \text{creditLimit} - \text{totalDue}$$

## 5. Accounting impact
- Sales Returns reverse revenue and cost recognitions:
  - **Credit Note Entry (Revenue Adjustment)**:
    - **Debit**: Sales Returns & Allowances (Contra-Revenue account)
    - **Credit**: Customer Accounts Receivable (Asset)
  - **Inventory Restocking Entry (Sound / Intact Goods)**:
    - **Debit**: Finished Goods / By-Product Inventory (Asset)
    - **Credit**: Cost of Goods Sold (P&L Expense reversal)
  - **Damaged Goods Entry (Damaged Return)**:
    - **Debit**: Damaged Goods / Inventory Loss (P&L Expense)
    - **Credit**: Cost of Goods Sold (or Finished Goods Inventory)
- Customer credit limit exposure is restored immediately upon posting.

## 6. Inventory impact
- Upon posting (`POSTED`):
  - An atomic `StockMovement` row is created for each return line:
    - If `condition == INTACT`:
      - `type`: `StockMovementType.SALE_RETURN`
      - `quantity`: `+returnKg` (positive quantity, incrementing stack stock)
      - `stackId`: designated restock stack
      - `sourceType`: `'SALES_RETURN'`
      - `sourceId`: `salesReturnLine.id`
    - If `condition == DAMAGED`:
      - `type`: `StockMovementType.DAMAGE`
      - `quantity`: `+returnKg` (positive quantity into quarantine/damaged stack)
      - `sourceType`: `'SALES_RETURN'`
      - `sourceId`: `salesReturnLine.id`
  - If `settlement == REPLACEMENT`:
    - `SalesOrderLine.fulfilledKg` is decremented by `returnKg`.
    - If the sales order was `COMPLETED` / `POSTED`, its status is updated back to `APPROVED` so the remaining quantity can be loaded and re-dispatched.

## 7. API Endpoints
- `GET /sales-returns`: List returns filtered by company, factory, status, type, customer, order.
- `GET /sales-returns/:id`: Retrieve single return voucher with full line details, restock stacks, and references.
- `POST /sales-returns`: Create new sales return in `DRAFT` status with automatic credit note numbering.
- `POST /sales-returns/:id/approve`: Approve sales return.
- `POST /sales-returns/:id/post`: Post sales return, execute inventory stock movements, and adjust fulfillment/customer ledger.
- `POST /sales-returns/:id/cancel`: Cancel draft or approved sales return.

## 8. Permissions & RBAC
- `sales-returns:READ`: View returns, credit notes, and registers.
- `sales-returns:CREATE`: Draft new sales return vouchers.
- `sales-returns:APPROVE`: Authorize sales return vouchers.
- `sales-returns:POST`: Post physical return into inventory and finalize credit notes.
- `sales-returns:UPDATE`: Cancel or edit draft return vouchers.

## 9. Validation & Business rules
- **Source Order Status**: Sales returns can only be created against `APPROVED` or fulfilled `POSTED` sales orders.
- **Return Quantity Limits**: Return weight cannot exceed dispatched net weight (or fulfilled order line quantity).
- **Stack Validation**: Restock stack must belong to the active factory and an active godown.
- **Rate Consistency**: Unit rate defaults to original agreed sales rate, preserving financial integrity.
- **Immutability**: Once `POSTED`, sales returns cannot be cancelled or modified.

## 10. UI/UX Design & Interactions
- Located under **OPERATIONS** → **Sales Returns**.
- KPI Summary Cards: Total Returns, Drafts, Approved, Posted, Total Return Value (BDT).
- Filter controls: Status (All, Draft, Approved, Posted, Cancelled), Type (All, Full, Partial, Damaged), and Text Search.
- Create Return Dialog:
  - Sales Order & optional Delivery Challan selectors.
  - Header cards: Return No, Credit Note No, Date, Type, Settlement Method, Reason, Remarks.
  - Interactive line items table: Item name, Condition selector (Intact / Damaged), Restock Stack selector, Bag count, Return KG, Unit Rate, and Line Amount with real-time totals.
- Register table with status chips, condition indicators, and workflow action buttons (Approve, Post, Cancel).
- **Bilingual Printable Credit Note Dialog**: Official commercial credit note voucher with company header, customer details, original order reference, line item breakdown, totals, and three-tier signature blocks (Store Officer, Quality Inspector, Accounts Manager).

## 11. Reports & Analytics
- Monthly Sales Return & Allowance register.
- Damaged goods & customer rejection analysis report by paddy/rice grade.
- Customer credit note adjustment summary for reconciliation with accounts receivable.
- Re-dispatch replacement fulfillment report.

## 12. Test cases & Verification plan
- Unit tests in `backend/src/modules/sales-return/sales-return.service.spec.ts`:
  - `list`: Filtered by companyId and factoryId.
  - `getReturn`: Retrieves return with line items; throws NotFoundException if non-existent.
  - `create`: Rejects empty lines list.
  - `create`: Rejects unapproved sales orders.
  - `create`: Rejects return quantity exceeding fulfilled/dispatched weight.
  - `create`: Successfully creates `DRAFT` return with auto-generated credit note number and calculated amounts.
  - `approve`: Transitions status from `DRAFT` to `APPROVED`.
  - `post`: Creates positive `StockMovement` (`SALE_RETURN` for intact, `DAMAGE` for damaged).
  - `post`: Decrements `fulfilledKg` and re-opens parent sales order when settlement is `REPLACEMENT`.
  - `cancel`: Cancels draft returns, rejects cancellation of posted returns.
- Controller tests in `backend/src/modules/sales-return/sales-return.controller.spec.ts`:
  - Verifies RBAC permissions across all routes.
- Customer Ledger integration test in `backend/src/modules/partners/partners.service.spec.ts`:
  - Verifies posted sales returns are credited against customer total due and restore available credit limit.
- Verification: Run `npm --prefix backend run test` (100% pass) and `npm --prefix frontend run typecheck` & `build` (100% pass).

