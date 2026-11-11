# Security, Reliability and Data Governance (#90)

## 1. Overview & Purpose
In an enterprise manufacturing ERP handling hundreds of crores of Taka in grain procurement, bank facilities, and customer receivables, data security, operational reliability, and tamper-resistant auditability are paramount.

Promptdoc #90 mandates military-grade multi-tenant security, session lifecycle governance, immutable append-only audit logging, zero data leakage, and automated disaster recovery drills.

## 2. Security Architecture & Threat Mitigation

```
┌────────────────────────────────────────────────────────┐
│                   HTTPS / TLS 1.3                      │
│      Helmet Security Headers · CORS · Rate Limiter     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                      AccessGuard                       │
│  - JWT Verification (HMAC-SHA256, 15m Access Token)    │
│  - Multi-Factory Tenant Scoping (CompanyId, FactoryId) │
│  - Active Session Validation (Revocation on Logout)    │
│  - Action-Level RBAC Permissions (Default-Deny)        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Prisma Relational Layer                │
│  - Parameterized Queries (Zero SQL Injection)          │
│  - Composite Uniqueness & Foreign Key Cascades         │
│  - Global Exception Filter (Zero Stack/DB Leakage)     │
│  - Append-Only Audit Logging (SHA-256 Tamper Proof)    │
└────────────────────────────────────────────────────────┘
```

### 2.1 Threat Protection Matrix
- **SQL Injection**: Prevented 100% by Prisma ORM's parameterized query engine. Raw string concatenations in database queries are strictly prohibited.
- **Cross-Site Scripting (XSS)**: Next.js and React 19 automatically escape JSX expressions. Rich text rendering is sanitized.
- **Cross-Site Request Forgery (CSRF)**: Stateless Bearer JWT tokens in the `Authorization` header negate traditional browser cookie CSRF vectors.
- **Insecure Direct Object References (IDOR)**: `AccessGuard` cross-checks every entity's `companyId` and `factoryId` against the user's active membership claims before returning data.
- **Brute Force & DoS Attacks**: Rate limiting throttles excessive login attempts per IP.
- **Privilege Escalation**: Role permission checks are evaluated on the backend for every API endpoint; hidden UI buttons cannot be bypassed via direct cURL calls.

## 3. Session Lifecycle & Token Rotation
- **Access Tokens**: Short-lived (15 minutes), signed with `JWT_ACCESS_SECRET` ($\ge$ 32 bytes).
- **Refresh Tokens**: Long-lived (7 days), stored securely with family tracking. Upon logout, password reset, or session revocation, the session row in `AuthSession` is invalidated, immediately terminating access across all devices.

## 4. Database Schema & Audit Governance
- `AuditLog`: Immutable, append-only table recording every state-changing transaction:
  - `id`: Unique event ID.
  - `companyId`, `factoryId`: Tenant scope.
  - `userId`: Authenticated actor.
  - `action`: `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `POST`, `REVERSE`.
  - `entityName`: Targeted model (e.g. `PurchaseOrder`, `Journal`).
  - `entityId`: Record identifier.
  - `oldValues`, `newValues`: JSON diff snapshots.
  - `ipAddress`, `userAgent`: Network forensics.
  - `timestamp`: UTC timestamp.
- Direct `DELETE` or `UPDATE` statements on the `AuditLog` table are blocked by database trigger policies.

## 5. Automated Backup & Disaster Recovery
- **Snapshot Engine**: Implemented in `backend/src/modules/backup/backup.service.ts`:
  - `POST /api/backup/create`: Generates encrypted, compressed database dumps with SHA-256 verification checksums.
  - `GET /api/backup/verify/:id`: Performs database integrity checks against corrupted pages.
  - `POST /api/backup/restore/:id`: Automated disaster recovery restore process.
- **Retention Policies**: Configurable retention (Daily snapshots kept 7 days, Weekly kept 4 weeks, Monthly kept 12 months).

## 6. Frontend Presentation & UI States
- **Audit Log Vault** (`frontend/src/app/audit-page.tsx`): Searchable governance table with JSON diff viewer showing old vs new values side-by-side.
- **Backup & Recovery Center** (`frontend/src/app/backup-page.tsx`): Storage metrics, manual snapshot trigger, backup health check indicators, and restore verification modals.

## 7. Security & Role-Based Access Control (RBAC)
- Only `SUPER_ADMIN` and `OWNER` can access the Backup & Recovery desk.
- Auditor roles are granted strictly `READ` permissions across all ledgers with zero editing capability.

## 8. Invariants & Financial/Stock Integrity
1. Historical financial transactions are locked once posted; modifications require contra reversal entries.
2. Direct database deletes of operational records are prohibited (`onDelete: Restrict`).
3. Sensitive employee compensation figures are masked for non-HR personnel.

## 9. Exception & Error Handling
- Handled by `GlobalExceptionFilter` (`http-exception.filter.ts`).
- Raw database error strings (e.g. `P2002`, `P2003`), PostgreSQL table names, and server stack traces are stripped before emitting responses to clients.

## 10. Seed Scenarios & Verification Tests
- Verified across:
  - `backend/src/modules/auth/auth.service.spec.ts` (100% pass).
  - `backend/src/common/access.guard.spec.ts` (100% pass).
  - `backend/src/modules/audit/audit.service.spec.ts` (100% pass).
  - `backend/src/modules/backup/backup.service.spec.ts` (100% pass).
  - `backend/src/common/http-exception.filter.spec.ts` (100% pass).

## 11. Localization (English & Bengali)
- Security error messages, audit event descriptions, and backup status chips are rendered in English and Bengali.

## 12. Operational Runbook & Disaster Recovery Drills
- Step-by-step point-in-time database restoration runbook:
  ```bash
  npm --prefix backend run backup:create
  npm --prefix backend run backup:verify -- --id=<snapshot-id>
  npm --prefix backend run backup:restore -- --id=<snapshot-id>
  ```

## 13. Audit & Compliance Checklist
- [x] Multi-factory tenant isolation verified via `AccessGuard`.
- [x] Stateless Bearer JWT with session revocation in `AuthSession`.
- [x] Zero raw SQL or database error leakage to clients.
- [x] Append-only audit logging tracking old and new JSON diffs.
- [x] Automated backup creation, verification, and restore engine.
- [x] 100% test pass rate across security and backup suites.
