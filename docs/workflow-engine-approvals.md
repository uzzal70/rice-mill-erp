# Workflow Engine, Approvals and Exceptions (#87)

## 1. Overview & Purpose
In an industrial rice mill, operational mistakes (such as accepting wet paddy, scaling incorrect tare weights, or issuing sales beyond customer credit limits) directly result in heavy financial losses. 

Promptdoc #87 mandates a flexible, multi-tier **Workflow Engine** and an autonomous **Exception Center**. The system governs critical business transactions across their full lifecycle, prevents unauthorized maker-checker bypass, and flags operational anomalies for immediate resolution.

## 2. Business Workflow & State Transitions

### 2.1 Multi-Tier State Machine
Documents progress through strict state transitions:
```
┌─────────┐      ┌───────────┐      ┌──────────────┐      ┌──────────┐      ┌────────┐      ┌────────┐
│  DRAFT  │ ───► │ SUBMITTED │ ───► │ UNDER_REVIEW │ ───► │ APPROVED │ ───► │ POSTED │ ───► │ LOCKED │
└────┬────┘      └─────┬─────┘      └──────┬───────┘      └────┬─────┘      └────────┘      └────────┘
     │                 │                   │                   │
     ▼                 ▼                   ▼                   ▼
[CANCELLED]       [REJECTED]          [REJECTED]          [REVERSED]
```

- **DRAFT**: Initiated by field operator (Weighbridge Clerk, Purchase Officer). Fully editable.
- **SUBMITTED**: Transferred to the manager queue. Field modifications locked.
- **UNDER_REVIEW**: Quality sample undergoing lab moisture or foreign matter analysis.
- **APPROVED**: Authorized by designated manager meeting monetary and operational thresholds.
- **REJECTED**: Returned to the operator with mandatory rejection reason.
- **POSTED**: Inventory ledger and double-entry General Ledger vouchers updated atomically.
- **LOCKED**: Transaction is completely immutable. Adjustments require linked reversal entries.
- **REVERSED**: Contra journal and stock reversal posted referencing the parent record.

### 2.2 Maker-Checker Governance
Separation of duties is strictly enforced:
- A user who creates a Purchase Order cannot approve their own order.
- A user who inputs an Expense Voucher cannot authorize disbursement or post the General Ledger voucher.
- Stock adjustments exceeding 1,000 KG or ৳ 50,000 require dual authorization (`GENERAL_MANAGER` and `OWNER`).

## 3. Autonomous Exception Center
The system actively detects and routes 10 critical operational exceptions:
1. **Weighbridge Mismatch**: Gross weight exceeds truck license capacity or tare weight is negative/suspicious.
2. **Duplicate Vehicle / Ticket**: Multiple active gate entries for the same truck license plate.
3. **Quality Hold / Rejection**: Moisture exceeds maximum tolerance (> 18.0%) or high refraction/dust %.
4. **Stock Shortage**: Warehouse stack balance insufficient for requested milling batch or sales dispatch.
5. **Capacity Exceeded**: Godown or silo capacity utilization exceeds 100%.
6. **Recovery Variance**: Milling yield falls outside standard benchmark range (50% $\le$ Recovery $\le$ 75%).
7. **Credit Limit Breach**: Sales order pushes customer receivable balance beyond approved credit limit.
8. **Unbalanced Voucher**: Debit and credit totals in manual journal attempt do not equal zero.
9. **Payment Mismatch**: Cash collection or bank transfer does not match sales invoice total.
10. **Document Expiry**: Trade license, environmental clearance, or insurance cert within 30 days of expiration.

Each exception item is assigned an owner, severity level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), priority, and resolution audit log.

## 4. Database Schema & Models
- `DocumentStatus` Enum:
  `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `POSTED`, `COMPLETED`, `CANCELLED`, `REVERSED`, `LOCKED`.
- Approval Metadata on core models (`PurchaseOrder`, `GoodsReceipt`, `ProductionBatch`, `SalesOrder`, `ExpenseVoucher`):
  `createdById`, `createdAt`, `submittedAt`, `reviewedById`, `reviewedAt`, `approvedById`, `approvedAt`, `postedById`, `postedAt`, `rejectionReason`.
- `Alert` / `ExceptionLog`: Tracks active anomalies with `companyId`, `factoryId`, `category`, `severity`, `title`, `resolvedAt`, and `resolvedById`.

## 5. Backend Services & API Endpoints
- **Module**: `backend/src/modules/approvals/`
- **Controller**: `ApprovalsController`
  - `GET /api/approvals/queue?companyId=<id>`: Pending approval items across all domains.
  - `POST /api/approvals/:domain/:id/approve`: Authorizes document transition.
  - `POST /api/approvals/:domain/:id/reject`: Rejects document with mandatory `{ reason: string }`.
  - `POST /api/approvals/:domain/:id/post`: Executes ledger and inventory posting.
- **Service**: `ApprovalsService` enforces monetary thresholds and maker-checker validation.

## 6. Frontend Presentation & UI States
- **Approvals Desk** (`frontend/src/app/approvals-page.tsx`): Unified inbox showing pending purchase orders, goods receipts, production batches, expense claims, and sales dispatches.
- **Smart Alerts Console** (`frontend/src/app/smart-alerts-page.tsx`): Live telemetry of active operational exceptions with 1-click remediation actions.
- **Status Stepper**: Visual horizontal progress indicator displaying document position in the approval pipeline.

## 7. Security & Role-Based Access Control (RBAC)
- Permission `PermissionAction.APPROVE` required on specific resource (e.g. `procurement`, `sales`, `expenses`).
- Emergency override is restricted exclusively to `SUPER_ADMIN` and `OWNER` with mandatory justification logged to `AuditLog`.

## 8. Invariants & Financial/Stock Integrity
1. No document can transition to `POSTED` without prior `APPROVED` status.
2. Maker cannot equal Checker (`createdById !== approvedById`).
3. Rejected documents cannot be posted to general ledger.

## 9. Exception & Error Handling
- Attempt by creator to approve own order throws:
  `ForbiddenException('Maker-checker violation: You cannot approve your own transaction.')`.
- Rejection without reason throws:
  `BadRequestException('A documented reason is mandatory when rejecting or returning a transaction.')`.

## 10. Seed Scenarios & Verification Tests
- Unit Tests in `approvals.service.spec.ts` and `approvals.controller.spec.ts` (100% pass).
- Multi-tier workflow verification in `critical-flows.spec.ts`.

## 11. Localization (English & Bengali)
- English: `Approved`, `Rejected`, `Pending Review`, `Maker-Checker Violation`
- Bengali: `অনুমোদিত`, `প্রত্যাখ্যাত`, `পর্যালোচনায় অপেক্ষমাণ`, `মেকার-চেকার লঙ্ঘন`

## 12. Operational Runbook & Disaster Recovery
- Approvers can delegate authority during planned leaves via role assignments.
- Overdue approvals (> 48 hours) trigger automated escalation notifications to General Manager.

## 13. Audit & Compliance Checklist
- [x] Configurable multi-tier state machine implemented.
- [x] Maker-checker separation of duties enforced.
- [x] Exception center actively tracks 10 operational anomalies.
- [x] Mandatory rejection justification captured.
- [x] 100% test pass rate across approval test suites.
