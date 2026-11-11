# 53. SMART ALERTS

## Status
Complete

## 1. Business workflow
- **Purpose and actors**: Provides real-time automated exception detection, risk warnings, operational anomaly surveillance, and compliance tracking across the mill. Actors: Managing Directors, Plant Heads, Mill Supervisors, Quality Lab Chemists, Account Managers, Inventory Officers.
- **Preconditions and source documents**: Evaluates live operational records, quality test lab parameters, weighbridge tickets, stock balances, production batches, and GL accounts across 11 key condition types:
  1. `LOW_STOCK`: Inventory below minimum safety threshold (e.g. < 5,000 KG).
  2. `HIGH_MOISTURE`: Paddy moisture exceeding safe threshold (e.g. > 14.5%).
  3. `LOW_RECOVERY`: Milling rice recovery below target ratio (e.g. < 62.0%).
  4. `CUSTOMER_OVERDUE`: Accounts receivable outstanding past standard 30-day terms.
  5. `SUPPLIER_PAYMENT_DUE`: Accounts payable exceeding configured threshold.
  6. `DOCUMENT_EXPIRING`: Compliance/corporate licenses or vehicle fitness expiring within 30 days.
  7. `MACHINE_MAINTENANCE_DUE`: Machinery overdue for scheduled service or under maintenance.
  8. `UNUSUAL_WEIGHT`: Weighbridge gross/tare variance anomaly (> 60,000 KG or tare >= gross).
  9. `UNUSUAL_PRODUCTION_LOSS`: Milling batch unaccounted weight discrepancy (> 3.5%).
  10. `NEGATIVE_MARGIN`: Sales order booked below unit break-even cost.
  11. `SLOW_MOVING_STOCK`: Godown lots without movement for > 60 days.
- **States and transitions**: `ACTIVE` $\to$ `ACKNOWLEDGED` $\to$ `DISMISSED`.
- **Approval, posting, cancellation, correction/reversal**: Alerts are actionable telemetry events with user-audited acknowledgment and dismissal.
- **Company/factory/location and ownership scope**: Multi-tenant isolation by `companyId` with optional scoping to specific factories via `factoryId`.

## 2. Database entities
- `SmartAlert`:
  - `id`, `companyId`, `factoryId`, `type`, `category`, `severity` (`CRITICAL`, `WARNING`, `INFO`), `title`, `message`, `referenceType`, `referenceId`, `metricValue`, `thresholdValue`, `isDismissed`, `dismissedAt`, `dismissedById`, `acknowledgedAt`, `acknowledgedById`.
- `AlertRule`:
  - `id`, `companyId`, `factoryId`, `type`, `isEnabled`, `severity`, `thresholdValue`, `description`.
- Migration: `0038_smart_alerts`.

## 3. Relationships
- Parent/child: Scoped to `Company` and `Factory`.
- References source entities across Gate & Weighbridge (#19, #21), Quality Lab (#22), Inventory (#23), Production (#26), Sales (#27), Accounting (#40), HR/Compliance (#45), Machine Management (#46), Fleet (#47), and Document Vault (#48).

## 4. Calculations
- **Moisture Threshold**: Alert if $\text{testedMoisture} > \text{thresholdMoisture}$ (default 14.5%).
- **Recovery Ratio**: $\frac{\text{Total Rice Output KG}}{\text{Total Paddy Input KG}} \times 100$; alert if $< 62.0\%$.
- **Milling Discrepancy**: $\frac{\text{Input KG} - \sum \text{Output KG}}{\text{Input KG}} \times 100$; alert if $> 3.5\%$.
- **Stock Aging**: Alert if $\Delta t_{\text{movement}} > 60 \text{ days}$.
- **Weighbridge Anomaly**: Alert if $\text{grossWeight} > 60,000 \text{ KG}$ or $\text{tareWeight} \ge \text{grossWeight}$.
- **Receivables Age**: Alert if $\text{debit} > 0$ and $\text{voucherDate} \le \text{today} - 30 \text{ days}$.

## 5. Accounting impact
- Reads GL accounts for receivables (1050) and payables (2010) to identify credit risks and pending liabilities. No direct financial postings triggered.

## 6. Inventory impact
- Constantly evaluates stock movements and godown balances to prevent stockouts, grain spoilage, and idle lot accumulation.

## 7. API
- `GET /alerts`: List active/historical alerts with severity counters (`criticalCount`, `warningCount`, `infoCount`, `totalUnresolved`).
- `POST /alerts/:id/dismiss`: Dismiss alert with reason and audit timestamp.
- `POST /alerts/:id/acknowledge`: Acknowledge alert.
- `GET /alerts/rules`: Get threshold rules.
- `PUT /alerts/rules`: Upsert rule threshold.
- `POST /alerts/scan`: Trigger diagnostic scan across all 11 categories.

## 8. Permissions
- `reports:READ`: Query alerts and rules.
- `reports:UPDATE`: Dismiss/acknowledge alerts, update rules, and run diagnostic scans.

## 9. Validation
- `AlertsQueryDto`: Validates `companyId`, optional `factoryId`, `category`, `severity`.
- `UpdateAlertRuleDto`: Validates `type`, `thresholdValue >= 0`, `severity`.

## 10. UI
- `frontend/src/app/smart-alerts-page.tsx`:
  - 4 Executive severity counter cards (CRITICAL, WARNING, INFO, Total Unresolved).
  - Category filter chips (ALL, INVENTORY, QUALITY, OPERATIONS, FINANCE, MAINTENANCE, COMPLIANCE).
  - Interactive table with severity badges, metric vs threshold comparison, and one-click Dismiss/Acknowledge.
  - "Run Diagnostic Scan" button with live spinner and feedback toast.
  - "Configure Rules" dialog to customize thresholds for all 11 conditions.
  - Bilingual English/Bengali labels.
  - Integrated into sidebar navigation and header badges.

## 11. Reports
- Diagnostic audit log and alert history reportable per company.

## 12. Tests
- `backend/src/modules/alerts/alerts.service.spec.ts`: Unit tests validating list with severity counts, dismissal, acknowledgment, rule upsert, and multi-category diagnostic scan.
- `backend/src/modules/alerts/alerts.controller.spec.ts`: Controller delegation tests.
- 100% test pass rate across 9 unit tests.

## 13. Audit & Compliance
- Dismissal and acknowledgment track `userId` and ISO timestamps.

