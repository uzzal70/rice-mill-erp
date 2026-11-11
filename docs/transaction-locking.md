# Transaction Locking (#78)

## 1. Overview & Purpose
In manufacturing ERP environments, once a commercial document or ledger entry has been reviewed, approved, and posted to the General Ledger, historical mutability introduces severe fraud risks, tax audit non-compliance, and inventory drift.

Task #78 enforces strict **Transaction Locking**:
Once a transaction achieves `APPROVED` and `POSTED` status, it enters a `LOCKED` state. In this state, direct edits or deletions are strictly prohibited at both the API and database levels. Any corrections or modifications must be executed through explicit, auditable, and linked reversal documents.

## 2. Business Workflow & State Lifecycle
Documents progress through a strict 6-tier state transition pipeline:
```
┌─────────┐      ┌───────────┐      ┌──────────┐      ┌──────────┐      ┌────────┐      ┌────────┐
│  DRAFT  │ ───► │ SUBMITTED │ ───► │ REVIEWED │ ───► │ APPROVED │ ───► │ POSTED │ ───► │ LOCKED │
└─────────┘      └───────────┘      └──────────┘      └──────────┘      └────────┘      └────────┘
     │                                                                                      │
     ▼                                                                                      ▼
[Editable]                                                                             [Immutable]
                                                                                   (Corrections via
                                                                                    Reversal Only)
```

1. **DRAFT**: Created by field operators (e.g. Weighbridge clerk, Purchase officer). Fully editable.
2. **SUBMITTED**: Submitted for operational review. Field edits restricted.
3. **REVIEWED**: Checked by Factory Manager or Quality In-Charge.
4. **APPROVED**: Authorized by designated manager with appropriate monetary threshold.
5. **POSTED**: General ledger lines and inventory stock ledger updated atomically.
6. **LOCKED**: Document is completely immutable. Cannot be updated or deleted.

## 3. Architecture & Data Flow
- **State Validation Interceptor/Guard**: Every `PUT`, `PATCH`, or `DELETE` request is intercepted before database execution.
- If `document.status === 'POSTED'` or `document.status === 'LOCKED'`, the request is immediately rejected with HTTP 403 Forbidden.
- Correction Flow:
  1. User requests correction via `POST /api/<module>/:id/reverse`.
  2. System generates linked reversal document (`status: 'REVERSED'`, `reversalOfId: original.id`).
  3. System creates contra accounting journal entries.
  4. System prompts user to generate a new corrected draft document.

## 4. Database Schema & Models
- `DocumentStatus` Enum:
  `DRAFT`, `SUBMITTED`, `REVIEWED`, `APPROVED`, `POSTED`, `LOCKED`, `REVERSED`, `CANCELLED`.
- Audit Metadata:
  `createdById`, `createdAt`, `approvedById`, `approvedAt`, `postedById`, `postedAt`, `lockedById`, `lockedAt`.
- Audit Trail:
  `AuditLog` records every transition attempt with user ID, IP address, device fingerprint, old state, and new state.

## 5. Backend Services & Guard Enforcement
Implemented in `backend/src/modules/approvals/approvals.service.ts` and `backend/src/common/access.guard.ts`:
```typescript
if (['POSTED', 'LOCKED'].includes(record.status)) {
  throw new ForbiddenException(
    `Transaction ${record.orderNumber || record.id} is LOCKED and cannot be edited. Create a reversal entry to adjust.`,
  );
}
```

## 6. Frontend Presentation & UI States
- **Approval & Workflow Desk** (`frontend/src/app/approvals-page.tsx`): Displays multi-tier pending approvals with role-based action buttons (`Approve`, `Reject`, `Post`).
- **Visual Locking Badges**:
  - `POSTED` / `LOCKED` documents display a solid green lock icon and disabled form fields.
  - Action buttons (`Edit`, `Delete`) are hidden and replaced with an authorized `Create Reversal` button for users with accounting permissions.
- **Data Integrity Dashboard** (`frontend/src/app/data-integrity-page.tsx`): Continuously verifies Rule #3: "Historical Transaction Immutability".

## 7. Security & Role-Based Access Control (RBAC)
- Only `SUPER_ADMIN` and `OWNER` can authorize approval overrides, but even super administrators cannot bypass ledger immutability without an audit trail.
- All lock transitions and reversal attempts are permanently logged to `AuditLog`.

## 8. Invariants & Financial/Stock Integrity
1. Once `postedAt !== null`, no `UPDATE` statement modifying quantity, unit rate, or partner ID may execute.
2. Corrections cannot delete original journals; net balances are adjusted solely through contra journals.
3. Every reversal maintains an exact 1-to-1 link to its parent record.

## 9. Exception & Error Handling
- Attempt to edit a locked record returns:
  `{ success: false, message: "Transaction PO-2026-001 is LOCKED. Corrections require an authorized reversal entry.", errors: ["DOCUMENT_LOCKED"] }`.
- Human-readable messages in both English and Bengali.

## 10. Seed Scenarios & Verification Tests
- Verified across:
  - `backend/src/modules/critical-flows.spec.ts` (Workflow 8: Transaction Locking & Reversal).
  - `backend/src/modules/accounting/auto-accounting.service.spec.ts` (Reversal contra entries).
  - `backend/src/modules/approvals/approvals.controller.spec.ts` (State transition validation).

## 11. Localization (English & Bengali)
- English: `Transaction is LOCKED and immutable. Create a reversal entry to adjust.`
- Bengali: `লেনদেনটি লক করা হয়েছে এবং পরিবর্তনযোগ্য নয়। সংশোধনের জন্য রিভার্সাল এন্ট্রি তৈরি করুন।`

## 12. Operational Runbook & Disaster Recovery
- If an erroneous transaction is posted in production:
  1. Do not manipulate the database via direct SQL `UPDATE`.
  2. Open the document in ERP and click "Create Reversal Voucher".
  3. Enter the audited business reason.
  4. Authorize the reversal journal.
  5. Create a new document with correct figures.

## 13. Audit & Compliance Checklist
- [x] `DocumentStatus` includes `APPROVED`, `POSTED`, `LOCKED`, and `REVERSED`.
- [x] Edit and Delete operations blocked on locked records.
- [x] Contra reversal workflow implemented in `auto-accounting.service.ts`.
- [x] Frontend disables inputs on locked documents and displays lock badges.
- [x] 100% test pass rate across critical flow and approval test suites.

