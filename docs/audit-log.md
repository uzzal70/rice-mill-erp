# Enterprise Audit Log & Immutable Trail

## Status
Complete

## 1. Business workflow
- **Purpose and actors:**
  - Provide an immutable, append-only security and operational audit trail recording every state change, transaction creation, update, authorization, deletion, and user authentication event across all ERP modules.
  - Track: User, Action, Module, Record ID, Old Value (before), New Value (after), IP Address, Client Device, Date, and Time.
  - Strict immutability guarantee: No user, admin, or API endpoint can edit, tamper with, or delete audit logs.
  - Primary actors: Managing Director, Security Auditor, Compliance Officer, System Administrator.
- **Preconditions and source documents:**
  - User session context, incoming HTTP request headers (IP address, User-Agent), and target entity state before and after mutation.
- **States and transitions:**
  - Events are permanently written at creation (`occurredAt`).
  - No status transitions exist for audit events because they are immutable history snapshots.
- **Approval, posting, cancellation, correction/reversal:**
  - Audit logging is synchronous or transactional with business logic.
  - Audit records cannot be reversed, canceled, or modified.
- **Company/factory/location and ownership scope:**
  - Scoped by `companyId` with optional system-wide tracking.

## 2. Database entities
- **`AuditEvent`**:
  - `id`: String (cuid)
  - `companyId`: String?
  - `userId`: String?
  - `userName`: String?
  - `action`: String (`CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `POST`, `LOCK`, `REJECT`, `LOGIN`, `STATUS_CHANGE`)
  - `resource`: String (Module: `PROCUREMENT`, `INVENTORY`, `SALES`, `ACCOUNTING`, `HR`, `MACHINE`, `FLEET`, `DOCUMENTS`, `APPROVALS`, `ROLES`, `AUTH`)
  - `resourceId`: String? (ID of audited entity)
  - `requestId`: String?
  - `ipAddress`: String?
  - `device`: String? (Client User-Agent / Device details)
  - `before`: Json? (Old Value snapshot)
  - `after`: Json? (New Value snapshot)
  - `occurredAt`: DateTime @default(now()) (Date & Time)
- **Unique/check constraints and indexes:**
  - `@@index([companyId, occurredAt])`
  - `@@index([resource, resourceId])`
  - `@@index([companyId, action])`
- **Migration:**
  - `0001_initial` (table definition) and `0037_audit_log_fields` (extended tracking columns).

## 3. Relationships
- References `Company(id)` with `onDelete: Restrict`.
- References `User(id)` with `onDelete: SetNull` (preserves historical log if user profile is deactivated).

## 4. Calculations
- **JSON Field Diffs:**
  $$\Delta(O, N) = \{ k \in \text{keys}(O) \cup \text{keys}(N) \mid O[k] \neq N[k] \}$$
- **Time Elapsed:**
  $$\text{Timestamp} = \text{occurredAt} \quad (\text{UTC Date \& Wall-Clock Time})$$

## 5. Accounting impact
- Independent audit assurance proving General Ledger balances, Journal Vouchers, and manual adjustments have not been modified outside sanctioned accounting controls.

## 6. Inventory impact
- Verifies stock adjustments, physical stock count overrides, and goods receiving reconciliation without allowing phantom changes.

## 7. API
- `GET /audit?companyId=...&resource=...&action=...&search=...&page=...` - Paginated event query with multi-attribute filtering.
- `GET /audit/summary?companyId=...` - Aggregate activity analytics, action frequencies, module metrics, and high-impact actions.
- `GET /audit/:id?companyId=...` - Retrieve single audit record with complete before/after JSON diffs.
- `POST /audit?companyId=...` - Secure endpoint for recording programmatic or security events.
- **Explicit Omission:** No `PUT`, `PATCH`, or `DELETE` endpoints exist.

## 8. Permissions
- Strictly protected behind `roles:read` (System Administrator / Executive Compliance roles only).
- Creating external audit records requires `roles:create`.

## 9. Validation
- `action` and `resource` are mandatory strings.
- `occurredAt` defaults to current timestamp and cannot be backdated.
- Service layer exposes no delete or update methods.

## 10. UI
- Central Audit & Security Console (`frontend/src/app/audit-page.tsx`) with:
  - Top summary KPI cards: Total Logged Events, High-Impact Actions, Monitored Modules, Top Active Operator.
  - Immutability guarantee banner.
  - Multi-criteria filter bar: Module/Resource, Action Type, Search by User, Record ID, or IP.
  - Tabular view with Date & Time, User, Action Chip, Module Chip, Record ID, IP & Device.
  - Interactive Diff Inspector Modal showing side-by-side Old Value (`before` in red) vs New Value (`after` in green) with full formatting.

## 11. Reports
- Executive Security Audit Log.
- High-Impact Decision Log (Postings, Approvals, Price/Rate Changes).
- User Login & Activity Timeline.

## 12. Tests
- `backend/src/modules/audit/audit.service.spec.ts`:
  - Event recording with user, action, module, recordId, diffs, IP, and device.
  - Immutability verification: confirms `updateEvent` and `deleteEvent` do not exist.
  - Paginated list queries with filters.
  - Single event retrieval and error handling.
  - Summary aggregation of actions, modules, and top users.
- `backend/src/modules/audit/audit.controller.spec.ts`:
  - Controller request forwarding and query parameter validation.

## 13. Audit & Compliance
- Compliant with SOC 2, ISO 27001, and statutory accounting requirements for complete traceability.
- Append-only database design prevents tampering or repudiation of critical business events.

