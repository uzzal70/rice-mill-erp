# Accounting and Inventory Consistency (#77)

## 1. Overview & Purpose
In a commercial rice milling enterprise, physical inventory and financial ledgers represent two views of the exact same physical reality. A divergence between warehouse stock and General Ledger balances leads to tax misstatements, inventory shrinkage, and inaccurate financial reports.

Under Task #77, the system establishes a strict, automated transactional consistency contract:
1. Every physical stock movement (receipt, issue, transfer, parboiling soak, milling conversion, packaging consumption, or sales dispatch) must trigger an immutable Inventory Ledger entry.
2. Every inventory valuation change or commercial transaction (purchase invoice, landed freight, production value shift, sales billing, customer receipt, or expense payment) must atomically create a double-entry Journal Voucher where $\sum \text{Debits} \equiv \sum \text{Credits}$.
3. Deletions of posted records are strictly prohibited; cancellations must be executed via automated Reversal Transactions (`createReversalJournal`).

## 2. Business Workflow & Rules
- **Paddy Procurement**: When a Goods Receipt Note (GRN) is posted:
  - Inventory Entry: Physical raw paddy stock increases in the designated Godown and Stack.
  - Accounting Entry: Debit Inventory - Raw Paddy, Credit Accounts Payable - Supplier.
- **Milling Production**: When a Milling Batch completes:
  - Inventory Entry: Raw paddy stock decreases; Head Rice, Broken Rice, and Bran stocks increase.
  - Accounting Entry: Debit Finished Goods Inventory, Credit Work In Progress / Raw Paddy Inventory.
- **Commercial Sales**: When a Delivery Challan is issued:
  - Inventory Entry: Finished rice stock decreases.
  - Accounting Entry: Debit Cost of Goods Sold (COGS), Credit Finished Goods Inventory.
  - Billing Entry: Debit Accounts Receivable - Customer, Credit Sales Revenue.
- **Cancellation via Reversal**: If a transaction must be cancelled:
  - An offsetting reversal document is created with inverted debits and credits.
  - The original document status transitions to `CANCELLED` or `REVERSED` with a pointer to the reversal journal ID (`reversalOfId`).

## 3. Architecture & Data Flow
```
┌─────────────────────────────────┐
│     Operational Event           │
│  (GRN, Batch, Challan, Invoice) │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│             Prisma Transaction ($transaction)           │
│  ┌─────────────────────────┐   ┌──────────────────────┐ │
│  │  Inventory Ledger Entry │   │  Auto-Accounting JRN │ │
│  │   Quantity (+/-) KG     │   │   Debit == Credit    │ │
│  └─────────────────────────┘   └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 4. Database Schema & Models
- `Journal`: Represents the header with `journalNumber`, `companyId`, `factoryId`, `postingDate`, `sourceType`, `sourceId`, and `status`.
- `JournalLine`: Individual ledger lines with `accountId`, `debit`, `credit`, and `description`.
- `StockMovement`: Tracks `itemId`, `godownId`, `stackId`, `quantity`, `direction`, and `referenceType`.
- Reversal link: `reversalOfId` referencing the superseded journal.

## 5. Backend Services & Implementation
Implemented in `backend/src/modules/accounting/auto-accounting.service.ts`:
```typescript
async createReversalJournal(companyId: string, originalJournalId: string, reason: string): Promise<Journal> {
  const original = await this.prisma.journal.findFirst({
    where: { id: originalJournalId, companyId },
    include: { lines: true },
  });
  if (!original) throw new NotFoundException('Original journal not found');

  const reversalLines = original.lines.map(line => ({
    accountId: line.accountId,
    debit: line.credit,   // Inverted
    credit: line.debit,   // Inverted
    description: `Reversal: ${reason} (Original: ${original.journalNumber})`,
  }));

  return this.createJournal(companyId, {
    journalNumber: `REV-${original.journalNumber}`,
    factoryId: original.factoryId,
    postingDate: new Date(),
    sourceType: 'REVERSAL',
    sourceId: original.id,
    reversalOfId: original.id,
    lines: reversalLines,
  });
}
```

## 6. Frontend Presentation & UI States
- **Data Integrity Dashboard** (`frontend/src/app/data-integrity-page.tsx`): Displays live monitoring of 11 core integrity rules including Negative Stock Prevention, Balanced Debit/Credit Invariant, and Reversal Trail Verification.
- **Stock Ledger View** (`frontend/src/app/stock-ledger-page.tsx`): Displays date-wise running balance of physical stock tied to source documents.
- **General Ledger View** (`frontend/src/app/accounting-page.tsx`): Displays running financial balances with clickable journal voucher details.

## 7. Security & Role-Based Access Control (RBAC)
- Only users with `ACCOUNTANT`, `GENERAL_MANAGER`, or `SUPER_ADMIN` roles can execute manual journal adjustments or reversals.
- Field operators (Storekeepers, Weighbridge Operators) cannot delete or modify posted records.

## 8. Invariants & Financial/Stock Integrity
1. $\sum \text{Debit} \equiv \sum \text{Credit}$ across all posted journals.
2. Godown physical balance $\ge 0$ (Negative stock is blocked before transaction commit).
3. Zero destructive database deletes on historical financial or inventory tables.

## 9. Exception & Error Handling
- Unbalanced journal attempts throw `BadRequestException('Journal lines must be balanced: Debits must equal Credits')`.
- Attempted deletion of posted journals throws `ForbiddenException('Posted transactions cannot be deleted. Use reversal.')`.

## 10. Seed Scenarios & Verification Tests
- Covered in `backend/src/modules/accounting/auto-accounting.service.spec.ts`:
  - `should generate a contra reversal journal inverting debits and credits` (Verified).
  - `should throw NotFoundException if original journal does not exist` (Verified).
  - `should maintain zero-sum balance between original and reversal journal` (Verified).

## 11. Localization (English & Bengali)
- UI and error messages provide Bengali counterparts:
  - English: `Journal lines must be balanced: Debits must equal Credits`
  - Bengali: `জার্নাল ভাউচার অবশ্যই ডেবিট এবং ক্রেডিট সমান হতে হবে`

## 12. Operational Runbook & Disaster Recovery
- In case of network interruption during complex multi-step postings, Prisma `$transaction` rolls back all changes, preventing partial inventory updates without corresponding accounting entries.

## 13. Audit & Compliance Checklist
- [x] Every stock movement writes to `StockMovement` ledger.
- [x] Every financial valuation creates a balanced `Journal`.
- [x] Reversal method `createReversalJournal` creates inverted contra lines.
- [x] Reversals reference original journal via `reversalOfId`.
- [x] 100% test pass rate across accounting and integrity suites.

