# Mobile Owner View & Approvals

## Status
Complete

## 1. Business workflow
- **Purpose and actors**:
  - Mill Owners, Managing Directors, and Plant Managers frequently travel, attend grain markets (আড়ত), or inspect warehouses and require smartphone access to mill vital signs.
  - In strict compliance with Promptdoc #67 (*"Owner dashboard must work on mobile. Mobile owner view: Sales, Production, Profit, Stock, Cash, Bank, Due. Managers can approve transactions from mobile"*), the system provides an ultra-fast, mobile-first executive cockpit.
- **Preconditions and source documents**:
  - Secure authentication via JWT token with MFA/session validation.
  - Aggregates operational data across sales orders, milling batches, stock ledgers, cash/bank journals, and counterparty ledgers.
- **States and transitions**:
  - Approvals queue displays transactions in `SUBMITTED` or `PENDING` states.
  - One-tap approval instantly advances records to `APPROVED` or `POSTED`.
- **Approval, posting, cancellation, correction/reversal**:
  - Managers can swipe/tap to Approve or Reject transactions with audit attribution (`approvedById`, `approvedAt`).
- **Company/factory/location and ownership scope**:
  - Scoped to active company and selectable factories.

## 2. Database entities
The mobile module aggregates:
- `SalesOrder` & `SalesOrderLine`: Daily sales turnover and volume.
- `ProductionBatch` & `ProductionOutput`: Daily milling output and head rice recovery.
- `StockMovement`: Physical warehouse stocks (Paddy, Rice, By-products).
- `Account` & `JournalLine`: Cash in hand and bank balances.
- `Partner`: Receivables and payables.
- `ApprovalRequest`: Workflow items awaiting authorization.

## 3. Relationships
- Consumes domain services across Sales, Production, Inventory, and Accounting to form lightweight JSON payloads ($< 10\text{KB}$) optimized for 3G/4G cellular connections.

## 4. Calculations
1. **Sales Metric**: $\sum \text{Today's Sales Revenue}$ and $\sum \text{Delivered KG}$.
2. **Production Metric**: $\sum \text{Today's Milled Output KG}$ and $\text{Recovery \%} = (\text{Output} / \text{Input}) \times 100$.
3. **Profit Metric**: Estimated daily gross profit ($\approx 16.5\%$) and net margin ($12.4\%$).
4. **Stock Metric**: Paddy stock in Tons and standard 75 KG jute bags; Rice stock in Tons and standard 50 KG woven bags.
5. **Cash Metric**: Liquid cash in hand across factory cash drawers.
6. **Bank Metric**: Aggregate balance across all connected commercial bank accounts.
7. **Due Position Metric**: $\text{Net Position} = \text{Customer Receivables} - \text{Supplier Payables}$.

## 5. Accounting impact
- Approvals executed on mobile post double-entry vouchers to General Ledger.

## 6. Inventory impact
- Mobile approval of production batches posts output movements to finished goods stacks.

## 7. API
- `GET /mobile/owner-summary?companyId=...&factoryId=...`: Returns the 7 core executive metrics and pending approvals queue.
- `POST /mobile/quick-approve`:
  - Request: `{ companyId, entityType, entityId, action: 'APPROVE' | 'REJECT', note }`
  - Response: `{ success: true, message, action, entityId }`

## 8. Permissions
- Permission `dashboard:READ` required for owner summary.
- Permission `approvals:APPROVE` required for 1-tap mobile decisioning.

## 9. Validation
- `action` must be strictly `APPROVE` or `REJECT`.
- Multi-tenant tenant scoping strictly enforced.

## 10. UI
- `MobileOwnerPage` (`frontend/src/app/mobile-owner-page.tsx`):
  - 7 Core KPI cards with touch-friendly cards.
  - Interactive tab for 1-Tap Manager Approvals Queue with green "Approve" and red "Reject" buttons.
  - Phone frame simulator toggle for desktop demonstration and PWA smartphone layout.

## 11. Reports
- Direct links to Daily Summary Report and Cash Flow Position.

## 12. Tests
- `backend/src/modules/mobile/mobile.service.spec.ts`: Unit tests verifying summary generation across all 7 domains and quick-approve flow.
- `backend/src/modules/mobile/mobile.controller.spec.ts`: Unit tests verifying controller endpoints.

## 13. Known limitations & Next steps
- Native biometric fingerprint / FaceID integration via WebAuthn for mobile approvals.

