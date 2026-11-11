# Documents, Printing and Multi-Channel Communication (#88)

## 1. Overview & Purpose
In a commercial rice milling environment, physical legal paper and instant digital notifications are mission-critical. Delivery trucks cannot leave the mill gate without a printed Security Gate Pass and Delivery Challan; suppliers require official Purchase Orders and Weighbridge tickets; and managing directors need instant WhatsApp and SMS alerts when high-value payments or quality rejections occur.

Promptdoc #88 defines the enterprise standards for professional document generation, certified A4 and thermal printing, document vaults, and multi-channel notifications.

## 2. Certified Enterprise Print Templates
The ERP includes 14 certified, production-ready document print layouts configured for standard A4 desktop printers and 80mm POS thermal receipt rolls:

| # | Document Code | Document Title | Purpose & Primary Counterparty | Standard Layout |
|---|---|---|---|---|
| 1 | `PRT-PO` | Purchase Order | Procurement contract with agreed rate & moisture slabs | A4 Portrait |
| 2 | `PRT-GP-IN` | Inward Gate Pass | Security entry record with truck plate & driver info | A4 / 80mm Thermal |
| 3 | `PRT-WB` | Weighbridge Ticket | Certified Gross, Tare, and Net weight slip | 80mm Thermal Slip |
| 4 | `PRT-QC` | Quality Inspection Report | Lab moisture %, grain refraction, and approval status | A4 Portrait |
| 5 | `PRT-GRN` | Goods Receipt Note | Warehouse inward receipt with godown and stack assignment | A4 Portrait |
| 6 | `PRT-PI` | Purchase Invoice | Supplier billing voucher with landed costs and deductions | A4 Portrait |
| 7 | `PRT-ST` | Stock Transfer Challan | Inter-godown or factory grain transfer challan | A4 Portrait |
| 8 | `PRT-PR` | Production Batch Report | Milling input, head rice, broken, bran, and recovery yield | A4 Portrait |
| 9 | `PRT-SO` | Sales Order Confirmation | Customer order confirmation with wholesale pricing | A4 Portrait |
| 10 | `PRT-DC` | Delivery Challan | Physical dispatch authorization and truck loading manifest | A4 Portrait |
| 11 | `PRT-GP-OUT`| Security Outward Gate Pass | Final gate barrier exit pass verified against Challan | A4 / 80mm Thermal |
| 12 | `PRT-SI` | Commercial Sales Invoice | Tax invoice with VAT/AIT breakdown and payment terms | A4 Portrait |
| 13 | `PRT-PRCT` | Money Receipt / Payment Slip| Customer collection or supplier payment acknowledgment | A4 / 80mm Slip |
| 14 | `PRT-JV` | Journal Voucher | Double-entry general ledger voucher with debits & credits | A4 Portrait |

Each template features:
- High-resolution corporate logo and registered factory header.
- Bangladeshi Tax Compliance: Company TIN, BIN, and Factory License number.
- Reprint Tracking: Number of times printed, timestamp, and operator signature (`reprintCount`, `printedAt`, `printedById`).
- QR Code Verification: Embedded SHA-256 validation hash to prevent document forgery.
- Dual Language Printing: Renderable in English and Bengali.

## 3. Multi-Channel Communication Architecture
The notification hub (`NotificationsService`) dispatches mission-critical operational and financial alerts across 4 channels:
```
┌─────────────────────────────────┐
│       Domain Business Event     │
│ (Approval, Rejection, Overdue)  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Notification Dispatcher     │
└───────┬─────────┬─────────┬─────┘
        │         │         │
        ▼         ▼         ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ In-App Alert │ │  SMS Gateway │ │Email Adapter │ │WhatsApp API  │
│  (WebSocket) │ │ (Banglalink/ │ │(SMTP/SES/    │ │ (Cloud API/  │
│              │ │   Grameen)   │ │  Sendgrid)   │ │  Twilio)     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

- **In-App Alerts**: Live badge counter in top navigation bar (`frontend/src/app/page.tsx`).
- **SMS Alerts**: Sent to truck drivers (Gate Pass issued) and paddy farmers (Purchase payment dispatched).
- **Email Vouchers**: PDF attachments sent to corporate buyers and institutional suppliers.
- **WhatsApp Alerts**: Instant notification of daily production recovery and cash collections to factory owners.

## 4. Database Schema & Models
- `Document`: Represents vaulted regulatory licenses and corporate certificates (`title`, `fileUrl`, `fileSize`, `mimeType`, `expiryDate`, `companyId`, `factoryId`).
- `PrintLog`: Tracks document reprint history (`documentType`, `documentId`, `reprintCount`, `printedById`, `printedAt`).
- `Notification`: In-app notification feed (`recipientId`, `domain`, `title`, `body`, `read`, `createdAt`).

## 5. Backend Services & API Endpoints
- **Print Service**: `backend/src/modules/print/print.service.ts`
  - `GET /api/print/templates`: Returns list of 14 certified templates.
  - `GET /api/print/:type/:id`: Generates print-ready HTML/PDF with QR verification hash.
- **Document Vault Service**: `backend/src/modules/documents/documents.service.ts`
  - `POST /api/documents/upload`: Secure file upload with MIME type validation and size limits (max 10MB).
  - `GET /api/documents/:id/download`: Signed URL / streaming download with permission check.
- **Notification Service**: `backend/src/modules/notifications/notifications.service.ts`

## 6. Frontend Presentation & UI States
- **Document Printing Desk** (`frontend/src/app/document-printing-page.tsx`): Interactive previewer with printer selector (A4 vs Thermal), zoom controls, and instant print trigger (`window.print()`).
- **Document Vault** (`frontend/src/app/documents-page.tsx`): Grid view of trade licenses, fire certifications, and factory permits with visual expiration countdown chips.
- **Notification Center** (`frontend/src/app/notifications-page.tsx`): Filterable feed with mark-as-read and domain tabs.

## 7. Security & Role-Based Access Control (RBAC)
- Only authorized users can download sensitive vouchers (e.g. Journal Vouchers require `ACCOUNTANT` role).
- Document download URLs are signed and non-public. Private files cannot be accessed via direct path traversal.

## 8. Invariants & Integrity
- Reprint count increments automatically on every print event to prevent unauthorized duplicate scale tickets or invoices.
- File uploads are validated: executable files (`.exe`, `.sh`, `.bat`) are strictly rejected.

## 9. Exception & Error Handling
- Failed SMS or email dispatches are logged to the notification retry queue without failing the parent database transaction.
- Expired documents trigger automated warning badges 30 days prior to expiry.

## 10. Seed Scenarios & Verification Tests
- Verified across:
  - `backend/src/modules/print/print.service.spec.ts` (100% pass).
  - `backend/src/modules/print/print.controller.spec.ts` (100% pass).
  - `backend/src/modules/documents/documents.service.spec.ts` (100% pass).
  - `backend/src/modules/notifications/notifications.service.spec.ts` (100% pass).

## 11. Localization (English & Bengali)
- Dual language printing: all 14 print layouts can render in English or standard Bengali typography.
- Currency in words generated automatically in both English ("Taka Three Hundred Fifty Thousand Only") and Bengali ("তিন লক্ষ পঞ্চাশ হাজার টাকা মাত্র").

## 12. Operational Runbook & Disaster Recovery
- Thermal printer drivers: Compatible with standard ESC/POS commands over USB, Network LAN, and Bluetooth.

## 13. Audit & Compliance Checklist
- [x] All 14 certified print templates implemented and verified.
- [x] Reprint tracking with timestamp and operator ID.
- [x] Document vault supports regulatory license uploads with expiry alerts.
- [x] Multi-channel notification architecture implemented.
- [x] 100% test pass rate across print, document, and notification suites.
