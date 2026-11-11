# 60. NOTIFICATION SYSTEM

## Status
Complete

## 1. Business workflow
- **Purpose and actors**: Provides an omni-channel operational alert and event-driven notification hub connecting mill managers, commercial officers, weighbridge operators, quality technicians, drivers, farmers, and customers across In-App, Email, SMS-ready, and WhatsApp-ready channels. Actors: Plant Heads, Managing Directors, Finance Managers, Storekeepers, Logistics In-charges, Truck Drivers, Grain Suppliers.
- **Preconditions and source documents**: Triggered by operational events across Commercial Sales & Receivables, Procurement Orders, Goods Receipts, Weighbridge Slips, Laboratory Samples, Production Runs, Machine Servicing, and Compliance Expiries.
- **4 Multi-Channel Communication Architecture**:
  1. **In-App**: Real-time internal notifications with unread counter badges on top AppBar, sound chimes, and slide-in notifications.
  2. **Email (SMTP)**: Transactional HTML notification templates for daily production digests, financial statements, and executive approvals.
  3. **SMS-Ready Gateway**: 160-character GSM and Unicode Bengali SMS integration interface for local Bangladesh telecommunications aggregators (e.g., SSL Wireless, Teletalk, Grameenphone, Banglalink, Robi, Twilio).
  4. **WhatsApp-Ready Architecture**: Interactive Meta Cloud WhatsApp Business API v19.0 template payloads delivering PDF challans, weighment scale receipts, and due balance payment reminders directly to mobile devices.
- **9 Core Operational Notification Triggers**:
  1. **Due**: Customer overdue receivables beyond credit period or supplier payable payment deadlines.
  2. **Payment**: Payment vouchers disbursed via bank transfer, cheque clearing, or cash money receipts acknowledged.
  3. **Low Stock**: Paddy, finished rice, bran, or packaging bags dropping below minimum safety stock reorder thresholds.
  4. **Approval**: Workflow approval requests submitted, approved, or rejected across purchase orders, gate passes, and journal entries.
  5. **Production**: Auto-milling batch completed, head rice recovery rate %, by-product yields, or process loss anomalies.
  6. **Quality**: Laboratory moisture test results, excessive moisture deductions, or grain sample rejection warnings.
  7. **Vehicle**: Vehicle gate entry, weighbridge gross/tare/net scale ticket certification, or final gate exit clearance.
  8. **Document Expiry**: Trade licenses, environmental clearance certificates, factory inspection licenses, truck fitness, and insurance policies approaching expiration.
  9. **Maintenance**: Captive steam boiler or milling machine run hours exceeding scheduled service thresholds or breakdown logging.

## 2. Database entities
- Migration `0041_notification_system` adds:
  - Enum `NotificationChannel`: `IN_APP`, `EMAIL`, `SMS`, `WHATSAPP`.
  - Enum `NotificationType`: `DUE`, `PAYMENT`, `LOW_STOCK`, `APPROVAL`, `PRODUCTION`, `QUALITY`, `VEHICLE`, `DOCUMENT_EXPIRY`, `MAINTENANCE`.
  - Enum `NotificationStatus`: `PENDING`, `SENT`, `DELIVERED`, `FAILED`, `READ`.
  - Model `AppNotification`:
    - `id`: CUID primary key
    - `companyId`: Tenant isolation foreign key
    - `factoryId`: Optional mill plant scope
    - `userId`: Optional specific recipient user (or null for company-wide broadcast)
    - `channel`: `NotificationChannel` enum
    - `type`: `NotificationType` enum
    - `title`: Alert headline
    - `message`: Detailed notification body
    - `status`: Delivery status
    - `isRead`: Boolean read flag
    - `readAt`: Timestamp when acknowledged
    - `referenceId`: Optional source document ID (e.g., PO-101, WT-5541)
    - `metadata`: JSON payload containing gateway-specific dispatches (SMS GSM encoding, WhatsApp interactive buttons, Email HTML subject)
    - `createdAt`, `updatedAt`
    - Composite index: `[companyId, userId, isRead, createdAt]`
    - Composite index: `[companyId, type, channel]`
  - Model `NotificationChannelConfig`:
    - `id`, `companyId`, `channel`, `isEnabled`, `provider`, `apiKey`, `senderId`, `webhookUrl`, `configJson`
    - Unique constraint: `[companyId, channel]`

## 3. Relationships
- **Notification to Company/Factory**: Scoped to authenticated `Company` and optional `Factory`.
- **Notification to User**: Optional association with `User` for targeted personal workflows.

## 4. Calculations
- **Unread Metrics**:
  $$\text{Unread Count} = \sum [n.\text{isRead} == \text{false} \land n.\text{companyId} == c]$$
- **SMS Segmentation**: Automatically segments text length into standard 160-char GSM-7 or 70-char Unicode Bengali SMS parts.

## 5. Accounting impact
- Informs finance teams of delinquent debtor dues, high-value journal postings, and successful vendor payments without altering double-entry ledgers.

## 6. Inventory impact
- Alerts warehouse managers when stock levels breach configured reorder points, preventing factory downtime.

## 7. API
- `GET /notifications?companyId=<id>&channel=<ch>&type=<t>&isRead=<bool>&limit=<n>`: Lists notifications with filtering.
- `GET /notifications/unread-count?companyId=<id>`: Returns `{ unreadCount }` for AppBar badge rendering.
- `GET /notifications/channels?companyId=<id>`: Returns status and integration parameters of all 4 channels.
- `POST /notifications`: Creates a new multi-channel notification.
- `POST /notifications/channels`: Configures gateway API keys and credentials for Email, SMS, or WhatsApp.
- `POST /notifications/mark-read`: Marks a single notification as read.
- `POST /notifications/mark-all-read`: Marks all unread notifications as read.
- `POST /notifications/dispatch`: Dispatches a diagnostic test notification across any channel.

## 8. Permissions
- `dashboard:READ`: View notifications and unread badge counts.
- `dashboard:UPDATE`: Mark notifications as read.
- `settings:CREATE`, `settings:UPDATE`: Configure notification channels and trigger test dispatches.

## 9. Validation
- `CreateNotificationDto`, `ConfigureChannelDto`, `DispatchTestNotificationDto`: Enforces enums for channel, type, status, non-empty title/message, and company scoping.

## 10. UI
- `frontend/src/app/notifications-page.tsx`:
  - Channel health cards (In-App, Email, SMS-ready, WhatsApp-ready).
  - Category tabs (All, Unread, Due & Payment, Stock & Production, Quality & Gate, Approvals & Governance).
  - Channel filter chips.
  - Interactive notification list with type icons, channel badges, relative time stamps, and mark-read buttons.
  - "Trigger Test Alert" dialog for all 9 types.
- Top AppBar Notification Bell with live unread badge counter (`Badge badgeContent={3}`) providing instant 1-click access.

## 11. Reports / Outputs
- Real-time notification feed, SMS dispatch payloads, WhatsApp JSON messages, and HTML email templates.

## 12. Tests
- `backend/src/modules/notifications/notifications.service.spec.ts`: Unit tests validating unread counts, 4 channels, notification creation with channel metadata, test dispatches for all 9 types, and mark-all-read.
- `backend/src/modules/notifications/notifications.controller.spec.ts`: Controller endpoint delegation tests.
- 100% test pass rate across 9 unit tests.

## 13. Audit & Compliance
- Channel configurations and manual alert dispatches are logged in `AuditEvent`.

