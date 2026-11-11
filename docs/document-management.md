# Document Management & Compliance Vault

## Status
Complete

## 1. Business workflow
- **Purpose and actors:**
  - Securely archive, classify, and monitor regulatory licenses, tax registrations, commercial contracts, vehicle papers, and quality certifications.
  - Automatically evaluate validity deadlines and emit prioritized renewal alerts before licenses lapse.
  - Primary actors: Managing Director, Compliance Officer, Factory Manager, Transport Coordinator, Accounts Manager.
- **Preconditions and source documents:**
  - Company and factory master records.
  - Source documents: Trade Licenses, TIN Certificates, BIN (VAT) 9.1 Certs, DIFE Factory Licenses, DoE Environmental Clearance Certificates, Fire Safety Licenses, Insurance Policies, Commercial Contracts, Quality/BSTI Certs.
- **States and transitions:**
  - Status: `ACTIVE` -> `EXPIRED` / `RENEWAL_IN_PROGRESS` / `ARCHIVED`.
  - Expiry alert levels:
    - `VALID`: Remaining days $> \text{reminderDaysBefore}$ (default 30 days).
    - `WARNING`: Remaining days $\le 30$ days.
    - `CRITICAL`: Remaining days $\le 7$ days.
    - `EXPIRED`: Remaining days $< 0$.
- **Approval, posting, cancellation, correction/reversal:**
  - Documents are registered with immutable timestamps and audit of the uploading user.
  - Updates allow updating file attachments, renewal issue dates, and extended expiry dates.
- **Company/factory/location and ownership scope:**
  - Scoped by `companyId` with optional `factoryId` tagging for site-specific licenses (e.g. factory layout or boiler permits).

## 2. Database entities
- **`CompanyDocument`**:
  - `id`: String (cuid)
  - `companyId`: String
  - `factoryId`: String?
  - `category`: String (`TRADE_LICENSE`, `TIN`, `BIN`, `FACTORY_LICENSE`, `ENVIRONMENTAL_LICENSE`, `INSURANCE`, `CONTRACTS`, `VEHICLE_DOCUMENTS`, `QUALITY_CERTIFICATES`, `OTHER`)
  - `title`: String
  - `documentNumber`: String?
  - `issuingAuthority`: String?
  - `issueDate`: DateTime?
  - `expiryDate`: DateTime?
  - `fileUrl`: String?
  - `fileName`: String?
  - `fileSize`: Int?
  - `mimeType`: String?
  - `status`: String @default("ACTIVE")
  - `reminderDaysBefore`: Int @default(30)
  - `remarks`: String?
  - `uploadedById`: String?
  - `createdAt`: DateTime @default(now())
  - `updatedAt`: DateTime @updatedAt
- **Unique/check constraints and indexes:**
  - `@@index([companyId, category])`
  - `@@index([companyId, expiryDate])`
- **Migration:**
  - `0035_document_management`

## 3. Relationships
- References `Company(id)` with `onDelete: Restrict`.
- Optional foreign association with uploading user.

## 4. Calculations
- **Days Remaining Calculation:**
  $$\text{Days Remaining} = \left\lceil \frac{\text{Expiry Date} - \text{Current Date}}{86400000} \right\rceil$$
- **Alert Urgency Classification:**
  $$\text{Urgency} = \begin{cases} \text{EXPIRED} & \text{if } \text{Days Remaining} < 0 \\ \text{CRITICAL} & \text{if } 0 \le \text{Days Remaining} \le 7 \\ \text{WARNING} & \text{if } 7 < \text{Days Remaining} \le \text{reminderDaysBefore} \\ \text{VALID} & \text{otherwise} \end{cases}$$

## 5. Accounting impact
- Indirect compliance impact: Prevents administrative statutory penalties, tax deductions at source (TDS) non-compliance, and factory stop-work orders resulting from expired regulatory permits.

## 6. Inventory impact
- Not directly mutating grain inventory. Unlocks legally compliant physical factory milling and interstate dispatch transport.

## 7. API
- `POST /documents?companyId=...` - Register document in vault.
- `GET /documents?companyId=...&category=...&search=...` - Search & filter document records.
- `GET /documents/notifications?companyId=...` - Aggregated expiration status metrics and urgency-ranked alerts.
- `GET /documents/:id?companyId=...` - Retrieve single document details.
- `PUT /documents/:id?companyId=...` - Update document metadata or renewal dates.
- `DELETE /documents/:id?companyId=...` - Delete document record.

## 8. Permissions
- Requires `settings:read` for viewing vault documents and alerts.
- Requires `settings:create` for uploading and registering documents.
- Requires `settings:update` for renewal modifications.
- Requires `settings:delete` for deleting records.

## 9. Validation
- Title and Category are strictly required.
- Expiry date when provided must be a valid ISO Date string.
- Reminder days before expiry must be a positive integer ($\ge 1$).

## 10. UI
- Multi-dimensional vault desk (`frontend/src/app/documents-page.tsx`) with:
  - Top summary KPI cards: Total Documents, Valid Documents, Expiring Soon ($\le 30$d), Expired.
  - Dynamic severity alert banner for documents requiring renewal attention.
  - Category filter pills (Trade License, TIN, BIN, Factory, Environmental, Insurance, Contracts, Quality, etc.).
  - Search input by title, number, or issuing authority.
  - Color-coded validity badges (Red for expired, Amber for warning, Green for valid).
  - Responsive modals for uploading new documents and updating renewed licenses.

## 11. Reports
- Statutory License Compliance Register.
- Expiration Schedule and Renewal Checklist.
- Regulatory Authority Directory.

## 12. Tests
- `backend/src/modules/documents/documents.service.spec.ts`:
  - Document registration and required fields validation.
  - Expiry notification engine testing (expired, critical $\le 7$d, warning $\le 30$d).
  - Update and delete operations.
- `backend/src/modules/documents/documents.controller.spec.ts`:
  - Request delegation and permission binding.

## 13. Audit & Compliance
- Immutable timestamping of uploads.
- Complete traceability of license numbers, issuing ministries, and inspection certificates.

