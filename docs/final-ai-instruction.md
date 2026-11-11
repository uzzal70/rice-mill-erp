# Final AI Instruction & Business Correctness (#82)

## 1. Overview & Purpose
Promptdoc #82 establishes the mental model and domain rigor required when developing the Rice Mill ERP:
The system is built not as a generic CRM or UI mockup, but as a specialized, industrial manufacturing and accounting ERP. Every architectural decision, service calculation, and database transaction must be evaluated through the eyes of real stakeholders:
- **Rice Mill Owner**: Demands profit visibility, theft prevention, working capital management, and total auditability.
- **Factory Manager**: Focuses on daily vehicle turnarounds, machine capacity, downtime, and shift throughput.
- **Purchase Manager**: Requires transparent moisture deductions, broker commission tracking, and supplier pricing contracts.
- **Production Manager**: Manages parboiling temperatures, drying moisture curves, milling recovery %, and by-product yields.
- **Store Manager**: Safeguards physical grain custody, stack-level bag counts, and prevents negative stock.
- **Accountant**: Enforces double-entry balance, supplier payables, customer credit limits, and statutory tax reporting.
- **Sales Manager**: Balances customer pricing, available-to-promise reservations, and delivery challans.
- **HR Manager**: Handles shift assignments, biometric attendance, overtime pay, and loan advance deductions.
- **Auditor**: Traces historical records, detects suspicious overrides, and reviews contra reversals.
- **Software Architect**: Ensures modularity, tenant isolation, zero client calculation, and 100% test pass rate.

## 2. The 10 Fundamental Business Invariant Questions
Before committing any feature or database transaction, the system rigorously verifies 10 questions:

### Q1: How does it affect physical stock?
Every stock movement explicitly writes to the `StockMovement` table with `godownId`, `stackId`, `itemId`, `quantityKg`, and direction (`INWARD`, `OUTWARD`, `ADJUSTMENT`). Physical stock can never drop below zero.

### Q2: How does it affect money?
All financial events calculate exact monetary impacts in BDT (`৳`). For example, purchase value reflects agreed price minus moisture deduction plus landed cost.

### Q3: How does it affect supplier or customer balance?
Procurement creates accounts payable liabilities; sales dispatches create accounts receivable assets. Partial receipts and collections maintain running customer/supplier ledgers.

### Q4: How does it affect accounting?
Commercial transactions atomically create double-entry journal vouchers where debits equal credits. Manual or unattended deletion of ledger journals is strictly blocked.

### Q5: How can the owner audit it?
Every transaction is indexed in the universal "Transaction Trace" engine (`GET /api/trace`) and visible in `TransactionTracePage`, allowing complete end-to-end lineage across all 11 supply chain stages.

### Q6: What happens if it is cancelled?
Historical records are never wiped from the database. Cancellations generate a contra reversal entry (`createReversalJournal`), preserving audit integrity.

### Q7: What happens if the transaction is reversed?
Reversal documents inherit a pointer to the original ID (`reversalOfId`) with inverted debit/credit lines and inverted inventory movements.

### Q8: Can different rice mills configure the formula?
Yes. Moisture deduction formulas (e.g., flat percentage, sliding-scale slabs, price deduction vs weight deduction) and Mon/KG conversion ratios are fully configurable via `MoisturePolicy` and `BangladeshConfig`.

### Q9: Can a non-technical employee use it?
Yes. Gate operators, scale technicians, and storekeepers use high-density, touch-friendly, bilingual (English/Bengali) interfaces with clear visual feedback and minimal clutter.

### Q10: Can the system handle multiple factories?
Yes. All operational records, inventories, and machine logs are isolated by composite keys `[companyId, factoryId]`. Cross-factory access is strictly prohibited by `AccessGuard`.

## 3. Architecture & Data Flow
```
┌────────────────────────────────────────────────────────┐
│                   Domain Event Occurs                  │
│       (Paddy Received, Batch Milled, Rice Dispatched)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Prisma Atomic Unit of Work                 │
│              prisma.$transaction([...])                │
│                                                        │
│  1. Invariant Validation (Stock >= 0, Balances valid)  │
│  2. Primary Operational Entity Creation                │
│  3. Physical Stock Movement Record Created             │
│  4. Double-Entry Journal Voucher Created (Dr == Cr)    │
│  5. Immutable Audit Log Event Persisted                │
└────────────────────────────────────────────────────────┘
```

## 4. Database Schema & Models
Entities strictly enforce multi-factory scoping:
- `Factory`: Maintains `companyId`, `code`, `name`, `productionType` (AUTO, SEMI_AUTO, CUSTOM).
- `UserRole`: Associates user memberships to specific factory scopes.

## 5. Backend Services & Business Standards
- All business domain logic resides strictly in `backend/src/modules/<domain>/<domain>.service.ts`.
- Mathematical calculations use dedicated pure functions or domain calculation engines (`calculation-engine.service.ts`).

## 6. Frontend Presentation Standards
- Zero business formula calculations in React components.
- Components only display formatted server responses and emit validated action requests.

## 7. Security & Role-Based Access Control (RBAC)
- Multi-tier role permissions enforced on all 38 backend modules.
- Non-financial roles automatically filtered from seeing cost margins or profit amounts.

## 8. Invariants & Financial/Stock Integrity
- Total debits $\equiv$ Total credits.
- Inventory on-hand $\ge 0$.
- Mass balance conservation: $\text{Grain In} = \text{Finished Rice} + \text{Broken} + \text{Bran} + \text{Loss}$.

## 9. Exception & Error Handling
- Meaningful domain errors instead of technical database exceptions.
- Contextual information provided (e.g. current vs requested quantities).

## 10. Seed Scenarios & Verification Tests
- 10 Promptdoc critical workflows validated with automated tests in `critical-flows.spec.ts`.
- Seed scenario `BAT-2026-001`, `SO-2026-001`, `PMT-2026-001` validates real-world stakeholder requirements.

## 11. Localization (English & Bengali)
- Built-in support for Bangla mill terminology: `চাল`, `ধান`, `মণ`, `কেজি`, `কুঁড়া`, `চালান`, `খতিয়ান`.

## 12. Operational Runbook & Disaster Recovery
- Point-in-time recovery and snapshot verification workflows established.

## 13. Audit & Compliance Checklist
- [x] All 10 persona viewpoints verified in system architecture.
- [x] All 10 invariant questions validated across transaction flows.
- [x] Zero business logic Formulation in frontend components.
- [x] 100% test pass rate across backend and frontend build pipelines.

