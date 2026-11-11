# Critical Data Integrity

## Status
Complete

## 1. Business workflow
- **Purpose and actors**:
  - The Critical Data Integrity module guarantees zero-corruption, double-entry mathematical invariants, and tenant security across all rice mill transactions.
  - Primary actors include Mill Owners, Managing Directors, Head Accountants, Weighbridge Operators, Quality Inspectors, and System Auditors.
- **Preconditions and source documents**:
  - Database transactions (`$transaction`) are mandatory for all multi-table operational writes.
  - Direct execution of critical mutations without passing integrity invariants is strictly prevented.
- **States and transitions**:
  - Financial records (Purchase Invoices, Sales Invoices, Journal Entries, Payroll Payments) transition through immutable lifecycle states: `DRAFT` $\to$ `SUBMITTED` $\to$ `APPROVED` $\to$ `POSTED` $\to$ `LOCKED`.
  - Once posted, records cannot be updated or deleted; corrections must be executed via auditable reversing journals or credit/debit notes.
- **Approval, posting, cancellation, correction/reversal**:
  - Unauthorized edits on posted records are rejected with `403 Forbidden` (`INTEGRITY_UNAUTHORIZED_FINANCIAL_EDIT_PREVENTED`).
  - Master price adjustments are restricted to users with `OWNER`, `MD`, or `ADMIN` roles (`INTEGRITY_UNAUTHORIZED_PRICE_CHANGE_PREVENTED`).
- **Company/factory/location and ownership scope**:
  - Company tenant isolation is enforced on every check. Invariants prevent cross-tenant collisions and enforce uniqueness within tenant scope.

## 2. Database entities
The module audits and protects the following core models:
- `StockMovement`: Append-only ledger preventing negative physical stock.
- `PurchaseInvoice`: Enforces global uniqueness of invoice numbers per tenant.
- `WeighbridgeTicket`: Prevents duplicate gross/tare tickets and uncalibrated scale readings.
- `GateEntry`: Prevents duplicate gate passes and multiple simultaneous inside-mill passes for a single vehicle.
- `Journal` & `JournalLine`: Enforces balanced double-entry equation ($\sum \text{Debit} = \sum \text{Credit}$).
- `QualitySample`: Prevents invalid moisture percentages outside physically viable grain bounds (8.0% - 35.0%).

## 3. Relationships
- **Referential Integrity**:
  - Stock movements link to `Item` and `Stack` with `onDelete: Restrict`.
  - Journal lines link to `Account` and `Journal` with `onDelete: Restrict`.
  - Gate entries link to `Vehicle` and `Company`.

## 4. Calculations
1. **Stock Non-Negative Check**:
   $$\text{Current Balance} = \sum \text{Inflows} - \sum \text{Outflows}$$
   $$\text{Assert: } \text{Current Balance} \ge \text{Deduction Quantity}$$
2. **Double-Entry Equilibrium Check**:
   $$|\sum \text{Debit} - \sum \text{Credit}| \le 0.01 \text{ BDT}$$
3. **Weighbridge Net Weight Check**:
   $$\text{Net Weight} = \text{Gross Weight} - \text{Tare Weight} > 0$$
   $$\text{Gross Weight} > \text{Tare Weight} > 0 \quad \text{and} \quad \text{Net Weight} \le 100,000 \text{ KG}$$
4. **Moisture Plausibility Check**:
   $$8.0\% \le \text{Moisture} \le 35.0\%$$

## 5. Accounting impact
- Enforces fundamental accounting equilibrium across all vouchers.
- Prohibits one-sided journal entries or unbalanced transactions.
- Posted vouchers cannot be modified; any correction generates a paired reversing entry.

## 6. Inventory impact
- Prevents negative stock under any condition. If an issue or dispatch quantity exceeds the current physical balance in a stack/godown, the transaction is rejected prior to database write.
- Prevents phantom inventory adjustments.

## 7. API
- `GET /integrity/rules`: Returns metadata for all 11 critical data integrity rules.
- `GET /integrity/audit?companyId=...`: Executes live diagnostic scan across stock ledgers, journals, gate entries, and quality samples.
- `POST /integrity/verify-transaction`: Verifies arbitrary transaction payload against all 11 invariant rules.

## 8. Permissions
- Permission `audit_logs:READ` required to run integrity audits and view rule status.
- Role-based authorization (`MILL_OWNER`, `MANAGING_DIRECTOR`, `ADMIN`) enforced for price changes and deletions.

## 9. Validation
- **All 11 Invariants Enforced**:
  1. Negative Stock Prevention
  2. Duplicate Invoice Prevention
  3. Duplicate Weighbridge Ticket Prevention
  4. Duplicate Gate Entry Prevention
  5. Unbalanced Journal Prevention
  6. Unauthorized Price Change Prevention
  7. Unauthorized Financial Edit Prevention
  8. Invalid Quantity Prevention (must be $> 0$)
  9. Invalid Weight Prevention ($\text{Gross} > \text{Tare} > 0$, $\le 100\text{T}$)
  10. Invalid Moisture Prevention ($8.0\% \le M \le 35.0\%$)
  11. Unauthorized Delete Prevention (no deletion of posted records)

## 10. UI
- `DataIntegrityPage` (`frontend/src/app/data-integrity-page.tsx`):
  - 4 Executive KPI cards: Active Invariants (11/11), Double-Entry Balance (0.00 Imbalance), Stock Sub-Zero Lock, Financial Ledger Immutability.
  - Interactive rule cards with bilingual English/Bengali descriptions and severity indicators.
  - Live "Run Integrity Diagnostic Audit" button.
  - Interactive Transaction Verification Sandbox to test weight, moisture, and journal lines against integrity rules.

## 11. Reports
- Returns structured JSON audit summary:
  `{ status: 'HEALTHY' | 'VIOLATION_DETECTED', totalRulesEnforced: 11, totalViolations: 0, violations: [], scannedAt: '...' }`

## 12. Tests
- Unit test suite: `backend/src/modules/integrity/integrity.service.spec.ts` (13 tests) and `integrity.controller.spec.ts` (3 tests).
- 100% test coverage across all 11 integrity conditions.

## 13. Known limitations & Next steps
- Real-time Redis distributed lock can be added for sub-millisecond concurrent weighbridge ticket generation on high-volume harvest seasons.

