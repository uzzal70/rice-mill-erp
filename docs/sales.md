# Sales (#35)

## Status
Complete for Quotations, Multi-channel Sales Orders, Customer Credit Exposure Validation, and Atomic Stock Reservation lifecycle. Dispatch (#37), Invoicing, and Customer Payment Ledgers connect in subsequent serial stages.

## 1. Business workflow
- **Purpose and actors**: Digitally manage commercial sales across all rice mill business models: Wholesale, Retail, Dealer, Distributor, Institutional, Cash Customer, Credit Customer, and Export Customer. Primary actors: Sales Officer, Sales Manager, Factory Manager, and Accounts Manager.
- **Preconditions and source documents**: Active company, active factory, active customer partner, finished rice/by-product items with base unit KG, and stack in an active godown. Optional source document: Sales Quotation (`SalesQuotation`).
- **States and transitions**:
  - Quotations: `DRAFT` → `APPROVED` (or `REJECTED`) → `POSTED` (when converted into Sales Order).
  - Sales Orders: `DRAFT` → `APPROVED` (atomically reserves stock at serializable transaction level) → `CANCELLED` (releases stock reservation immediately).
- **Approval, posting, cancellation, correction/reversal**:
  - Approving a quotation freezes terms and allows 1-click conversion to a sales order.
  - Approving a sales order runs an atomic, serialized stock availability check (`available = physical_on_hand - active_reservations`) and stamps `reservedAt` on every line.
  - Cancelling an order (permitted for `DRAFT` or `APPROVED` orders) releases the reservation immediately.
  - Posted records are immutable and audited in `AuditEvent`.
- **Company/factory/location and ownership scope**: Every quotation and order is strictly scoped to `companyId` and `factoryId`. Customer must belong to `companyId`. Stacks must belong to `factoryId`. Cross-tenant and cross-factory references are rejected.

## 2. Database entities
- **`SalesQuotation`**:
  - `id`, `companyId`, `factoryId`, `customerId`, `quotationNumber`, `channel`, `status`, `validUntil`, `currency`, `exchangeRate`, `totalAmount`, `remarks`, `createdById`, `approvedById`, `approvedAt`, `createdAt`, `updatedAt`.
  - Unique: `[companyId, quotationNumber]`, `[companyId, factoryId, id]`.
  - Indexes: `[companyId, factoryId, status, createdAt]`, `[companyId, customerId, createdAt]`.
- **`SalesQuotationLine`**:
  - `id`, `companyId`, `factoryId`, `quotationId`, `itemId`, `quantityKg`, `unitRate`, `lineAmount`.
  - Index: `[companyId, factoryId, itemId]`.
- **`SalesOrder`**:
  - `id`, `companyId`, `factoryId`, `customerId`, `quotationId`, `orderNumber`, `channel`, `status`, `requestedDelivery`, `currency`, `exchangeRate`, `exportCountry`, `portOfDischarge`, `lcNumber`, `totalAmount`, `remarks`, `createdById`, `approvedById`, `approvedAt`, `createdAt`, `updatedAt`.
  - Unique: `[companyId, orderNumber]`, `[companyId, factoryId, id]`.
  - Indexes: `[companyId, factoryId, status, createdAt]`, `[companyId, customerId, createdAt]`.
- **`SalesOrderLine`**:
  - `id`, `companyId`, `factoryId`, `salesOrderId`, `itemId`, `stackId`, `packagingItemId`, `bagCount`, `quantityKg`, `unitRate`, `lineAmount`, `reservedAt`, `fulfilledKg`.
  - Index: `[companyId, factoryId, itemId, stackId, reservedAt]`.
- **Migrations**: `0024_sales_orders`, `0025_sales_quotations_and_export`.

## 3. Relationships
- Parent/child:
  - `Company` (1) → `SalesQuotation` (N) → `SalesQuotationLine` (N)
  - `Company` (1) → `SalesOrder` (N) → `SalesOrderLine` (N)
  - `Partner` (CUSTOMER) (1) → `SalesQuotation` (N) / `SalesOrder` (N)
  - `SalesQuotation` (1) → `SalesOrder` (N) (optional link)
  - `Stack` (1) → `SalesOrderLine` (N)
  - `Item` (1) → `SalesQuotationLine` (N) / `SalesOrderLine` (N)
- Retention: `ON DELETE RESTRICT` on all foreign key constraints.

## 4. Calculations
- **Line Amount**: $\text{lineAmount} = \text{round}(\text{quantityKg} \times \text{unitRate}, 2)$ (half-up).
- **Order Total**: $\text{totalAmount} = \sum \text{lineAmount}$.
- **Customer Credit Exposure**:
  $$\text{Exposure} = \text{openingDue} + \sum_{\text{status}=\text{APPROVED}} \text{approvedOrderAmount} + \text{currentOrderTotal}$$
  If $\text{Exposure} > \text{creditLimit}$, creation is rejected with actionable error.
- **Available Unreserved Stock**:
  $$\text{Available} = \sum \text{StockMovement}(\text{itemId}, \text{stackId}) - \sum_{\text{APPROVED}} (\text{quantityKg} - \text{fulfilledKg})$$
  If $\text{Available} < \text{requestedKg}$, approval is rejected at serializable isolation.

## 5. Accounting impact
- Sales Quotations and Sales Orders do not alter financial general ledger balances directly.
- Financial impact occurs at Dispatch (COGS recognition) and Invoicing (Dr Customer A/R, Cr Sales Revenue), which are coordinated with #37 Dispatch and subsequent invoicing.
- Customer credit limit checks protect against uncollectible exposure prior to dispatch.

## 6. Inventory impact
- Quotations have zero inventory impact.
- Draft Orders have zero inventory impact.
- Order Approval creates an active stock reservation on the specific stack by stamping `reservedAt` on the line and setting status to `APPROVED`. Available physical stock for other orders is reduced.
- Order Cancellation releases the reservation immediately.
- Actual physical stock deduction occurs at Dispatch (#37).

## 7. API
- `GET /sales/quotations` (filters: `companyId`, `factoryId`, `search`, `status`, pagination).
- `GET /sales/quotations/:id` (detail with lines and customer info).
- `POST /sales/quotations` (create draft quotation).
- `POST /sales/quotations/:id/approve` (approve quotation).
- `POST /sales/quotations/:id/reject` (reject quotation).
- `GET /sales/orders` (filters: `companyId`, `factoryId`, `channel`, `status`, `search`, pagination).
- `GET /sales/orders/:id` (detail with lines, customer, and quotation info).
- `POST /sales/orders` (create draft sales order with credit validation).
- `POST /sales/orders/:id/approve` (atomic stock reservation and approval).
- `POST /sales/orders/:id/cancel` (cancel order and release reservation).

## 8. Permissions
- `sales:READ`: View quotations, sales orders, customer summaries.
- `sales:CREATE`: Create quotations and sales orders.
- `sales:APPROVE`: Approve quotations, approve orders (reserve stock), reject quotations.
- `sales:UPDATE`: Cancel orders (release reservations).

## 9. Validation
- Line quantities and transaction unit rates must be strictly positive decimals.
- Items must be active `RICE` or `BY_PRODUCT` in unit `KG`.
- Packaging items (if specified) must be active `PACKAGING`.
- For `EXPORT` channel: `exportCountry` is mandatory; foreign currency orders must include positive `exchangeRate`.
- For `CREDIT` channel: Customer must have approved `creditLimit`; total exposure cannot exceed `creditLimit`.
- Stacks must belong to the active factory and belong to active godowns.

## 10. UI
- Bilingual (English / বাংলা) desk in `frontend/src/app/sales-page.tsx`.
- Tabbed workspace: **Sales Orders** and **Quotations**.
- Quotation Desk: Creation form with real-time total, approve/reject buttons, and 1-click **Convert to Order** action.
- Order Desk: Multi-channel form, customer credit indicator, export field drawer, line items with bag counts and stack pickers.
- Status chips and action triggers: Approve & Reserve, Cancel & Release.

## 11. Reports
- Sales order backlog register.
- Reserved stock vs on-hand stock breakdown.
- Channel-wise sales summary (Wholesale, Retail, Dealer, Export, etc.).

## 12. Tests
- `backend/src/modules/sales/sales.service.spec.ts`:
  - Quotation creation, totals, audit trail.
  - Quotation approval and non-draft rejection.
  - Multi-channel order creation, export fields, and FX handling.
  - Credit limit checks: credit channel without limit rejected, exposure exceeding limit rejected, cash order allowed despite limit.
  - Serializable stock reservation: approval reserves stock when available, insufficient stock rejected.
  - Order cancellation releases reservation; double cancellation rejected.
- `backend/src/modules/sales/sales.controller.spec.ts`:
  - RBAC permission metadata verified across all quotation and sales order routes.

## 13. Implementation and verification
- Files changed:
  - `database/prisma/schema.prisma`
  - `database/prisma/migrations/0025_sales_quotations_and_export/migration.sql`
  - `backend/src/modules/sales/sales.dto.ts`
  - `backend/src/modules/sales/sales.service.ts`
  - `backend/src/modules/sales/sales.controller.ts`
  - `backend/src/modules/sales/sales.service.spec.ts`
  - `backend/src/modules/sales/sales.controller.spec.ts`
  - `frontend/src/app/sales-page.tsx`
  - `docs/sales.md`
- Verification:
  - 28 backend test suites (168 tests) passed.
  - Backend build (`nest build`) passed.
  - Frontend typecheck (`tsc --noEmit`) and production build (`next build`) passed.
  - Prisma schema validation and client generation passed.
