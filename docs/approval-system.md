# Multi-Tier Approval & Workflow Governance System

## Status
Complete

## 1. Business workflow
- **Purpose and actors:**
  - Multi-tier workflow authorization, verification, posting, and permanent audit sealing for critical operational and financial transactions (Purchase Orders, Purchase Invoices, Sales Orders, Sales Dispatches, Expense Claims, Journal Vouchers, Payroll).
  - Enforces corporate financial controls, prevents unauthorized document alteration, and strictly prohibits silent database modifications after general ledger or stock posting.
  - Primary actors: Entry Clerks, Verifying Supervisors, Department Heads, General Manager / Managing Director, Internal Auditor.
- **Preconditions and source documents:**
  - Original operational documents (PO, Invoice, Voucher, Dispatch, Challan).
- **States and transitions:**
  - `DRAFT`: Editable by entry creator.
  - $\to$ `SUBMITTED`: Submitted by clerk/operator for verification.
  - $\to$ `REVIEWED`: Examined and cross-checked by supervisor/line manager.
  - $\to$ `APPROVED`: Authorized by managing director or finance controller.
  - $\to$ `POSTED`: Automatically committed to double-entry general ledger and warehouse inventory ledger.
  - $\to$ `LOCKED`: Immutable audit lock applied. Silent edits are strictly forbidden.
  - Alternative exits:
    - `REJECTED`: Rejected with mandatory reason (blocked once posted or locked).
    - `RETURNED_FOR_CORRECTION`: Returned to creator with feedback comments; transitions back to draft state for correction and re-submission.
- **Approval, posting, cancellation, correction/reversal:**
  - Once `POSTED` or `LOCKED`, in-place editing or silent deletions are rejected by the system.
  - Corrections must be conducted through explicit reversal transactions (`REVERSAL_VOUCHER`) or adjustment transactions.
- **Company/factory/location and ownership scope:**
  - Scoped by `companyId` with optional `factoryId`.

## 2. Database entities
- **`ApprovalRequest`**:
  - `id`: String (cuid)
  - `companyId`: String
  - `factoryId`: String?
  - `entityType`: String (`PURCHASE_ORDER`, `PURCHASE_INVOICE`, `SALES_ORDER`, `SALES_DISPATCH`, `EXPENSE`, `JOURNAL_VOUCHER`, `PAYROLL`)
  - `entityId`: String
  - `entityNumber`: String
  - `title`: String
  - `amount`: Decimal(18, 2)?
  - `status`: String (`DRAFT`, `SUBMITTED`, `REVIEWED`, `APPROVED`, `POSTED`, `LOCKED`, `REJECTED`, `RETURNED_FOR_CORRECTION`)
  - `currentStage`: String (`DRAFT`, `REVIEW`, `APPROVAL`, `POSTING`, `LOCKED`, `REJECTED`)
  - `submittedById`, `submittedAt`: String?, DateTime?
  - `reviewedById`, `reviewedAt`: String?, DateTime?
  - `approvedById`, `approvedAt`: String?, DateTime?
  - `postedById`, `postedAt`: String?, DateTime?
  - `lockedAt`: DateTime?
  - `rejectionReason`: String?
  - `correctionNotes`: String?
  - `createdAt`, `updatedAt`: DateTime
- **`ApprovalAction`**:
  - `id`: String (cuid)
  - `approvalRequestId`: String
  - `actionType`: String (`SUBMIT`, `REVIEW`, `APPROVE`, `POST`, `LOCK`, `REJECT`, `RETURN_FOR_CORRECTION`, `REVERSE`)
  - `fromStatus`: String
  - `toStatus`: String
  - `actorId`: String
  - `actorName`: String?
  - `actorRole`: String?
  - `comments`: String?
  - `actionTimestamp`: DateTime @default(now())
- **Unique/check constraints and indexes:**
  - `@@unique([companyId, entityType, entityId])`
  - `@@index([companyId, status])`
  - `@@index([companyId, entityType, status])`
  - `@@index([approvalRequestId, actionTimestamp])`
- **Migration:**
  - `0036_approval_system`

## 3. Relationships
- `ApprovalRequest` references `Company(id)`.
- `ApprovalAction` references `ApprovalRequest(id)` with `onDelete: Cascade`.

## 4. Calculations
- **Workflow State Progression Enforcement:**
  $$\text{Valid Transitions} = \begin{cases} \text{SUBMIT}: & \text{DRAFT} \to \text{SUBMITTED} \\ \text{REVIEW}: & \text{SUBMITTED} \to \text{REVIEWED} \\ \text{APPROVE}: & \{\text{SUBMITTED}, \text{REVIEWED}\} \to \text{APPROVED} \\ \text{POST}: & \text{APPROVED} \to \text{POSTED} \\ \text{LOCK}: & \text{POSTED} \to \text{LOCKED} \\ \text{REJECT}: & \{\text{SUBMITTED}, \text{REVIEWED}\} \to \text{REJECTED} \\ \text{RETURN}: & \{\text{SUBMITTED}, \text{REVIEWED}\} \to \text{RETURNED\_FOR\_CORRECTION} \end{cases}$$
- **Post-Posting Immutability Guard:**
  $$\text{Mutation Attempted}(T) \implies \begin{cases} \text{Allowed} & \text{if } \text{status}(T) \in \{\text{DRAFT}, \text{SUBMITTED}\} \\ \text{Blocked (Exception)} & \text{if } \text{status}(T) \in \{\text{POSTED}, \text{LOCKED}\} \end{cases}$$

## 5. Accounting impact
- General Ledger posting is gated strictly behind the `APPROVED` state.
- Post-posting corrections require balancing debit/credit reversal journals rather than silent balance alterations.

## 6. Inventory impact
- Physical stock reservation and goods dispatch challans are gated behind approval authorization.

## 7. API
- `POST /approvals?companyId=...` - Register transaction for approval workflow.
- `GET /approvals?companyId=...&status=...&entityType=...&search=...` - List all governance requests.
- `GET /approvals/inbox?companyId=...` - Retrieve active pending review and approval tasks.
- `GET /approvals/:id?companyId=...` - Fetch single approval request with full audit timeline.
- `POST /approvals/:id/transition?companyId=...` - Execute workflow transition action (`SUBMIT`, `REVIEW`, `APPROVE`, `POST`, `LOCK`, `REJECT`, `RETURN_FOR_CORRECTION`).

## 8. Permissions
- Requires `procurement:read` for viewing approval requests and inbox.
- Requires `procurement:create` for initiating approval requests.
- Requires `procurement:update` for transitioning actions.

## 9. Validation
- Rejection action (`REJECT`) requires non-empty `comments`.
- Return for correction action (`RETURN_FOR_CORRECTION`) requires non-empty feedback `comments`.
- Attempting to reject or return a transaction that is already `POSTED` or `LOCKED` is rejected with `BadRequestException`.

## 10. UI
- Multi-view governance desk (`frontend/src/app/approvals-page.tsx`) with:
  - Top summary KPI cards: Pending Review, Pending Final Approval, Ready to Post, Locked & Protected.
  - Tab 0: Approval Inbox for active items requiring decision with direct action buttons.
  - Tab 1: All Transactions Registry with status and entity filters, search, and audit history inspector.
  - Tab 2: Workflow Governance Policy explaining stages and anti-silent-modification rules.
  - Modals for action confirmation with required comments, and full visual timeline modal.

## 11. Reports
- Transaction Authorization Audit Log.
- Pending Approval Backlog and Turnaround Time Register.
- Rejection and Return for Correction Reason Summary.

## 12. Tests
- `backend/src/modules/approvals/approvals.service.spec.ts`:
  - Request creation in `DRAFT`.
  - Sequential lifecycle: `DRAFT` $\to$ `SUBMITTED` $\to$ `REVIEWED` $\to$ `APPROVED` $\to$ `POSTED` $\to$ `LOCKED`.
  - Rejection validation (requires comments, blocks rejection of posted records).
  - Return for correction flow.
  - `assertMutable` anti-silent-modification validation for `POSTED` / `LOCKED`.
  - Approval inbox summary counts aggregation.
- `backend/src/modules/approvals/approvals.controller.spec.ts`:
  - Transition and inbox delegation verification.

## 13. Audit & Compliance
- Tamper-evident transition audit trail logging every action type, timestamp, actor identity, role, and comment.
- Full compliance with international financial reporting standards (IFRS/IAS) preventing unrecorded or silent accounting alterations.

