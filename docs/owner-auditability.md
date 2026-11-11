# Owner Auditability - Transaction Trace (#79)

## 1. Overview & Purpose
In a commercial rice milling enterprise, an owner or executive auditor must have instant, transparent traceability across the entire lifecycle of any physical or financial transaction. 

Under Task #79, the ERP implements the **"Transaction Trace"** engine and visual lineage pipeline. Starting from any arbitrary reference—such as a Supplier Code, Gate Entry Number, Truck License Plate, Scale Ticket, Lab QC Sample, Purchase Order (PO), Goods Receipt Note (GRN), Milling Batch Number, Delivery Challan, Customer Sales Order, Bank Payment Receipt, or Journal Voucher—the owner can trace upstream and downstream operations across all 11 stages of the milling supply chain.

## 2. Business Workflow & 11-Stage Pipeline
```
┌─────────────┐
│ 1. SUPPLIER │  Farmer / Aratdar profile & verification
└──────┬──────┘
       │ [DISPATCHED_TO_MILL]
       ▼
┌───────────────┐
│ 2. GATE ENTRY │  Inward security log & truck license plate
└──────┬────────┘
       │ [SCALED_NET_WEIGHT] & [LAB_INSPECTION]
       ├─────────────────────────────────┐
       ▼                                 ▼
┌────────────────┐             ┌──────────────────┐
│ 3. WEIGHBRIDGE │             │ 4. QUALITY (LAB) │
│ Gross/Tare/Net │             │ Moisture %, Dust │
└──────┬─────────┘             └─────────┬────────┘
       │                                 │
       └────────────────┬────────────────┘
                        │ [COMMERCIAL_CONTRACT]
                        ▼
            ┌───────────────────────┐
            │ 5. PURCHASE ORDER(PO) │  Price / KG & Moisture Deductions
            └───────────┬───────────┘
                        │ [STOCK_RECEIVED]
                        ▼
            ┌───────────────────────┐
            │ 6. GOODS RECEIPT(GRN) │  Godown & Stack physical placement
            └───────────┬───────────┘
                        │ [RAW_CONSUMPTION]
                        ▼
            ┌───────────────────────┐
            │ 7. PRODUCTION BATCH   │  Parboiling, Drying & Milling
            └───────────┬───────────┘
                        │ [MILLED_OUTPUT]
                        ▼
            ┌───────────────────────┐
            │ 8. FINISHED GOODS     │  Head Rice, Broken Rice & Rice Bran
            └───────────┬───────────┘
                        │ [COMMERCIAL_SALES]
                        ▼
            ┌───────────────────────┐
            │ 9. SALES & CHALLAN    │  Delivery Challan, Gate Pass & Billing
            └───────────┬───────────┘
                        │ [BANK_COLLECTION]
                        ▼
            ┌───────────────────────┐
            │ 10. PAYMENT / CASH    │  Customer collection / Supplier payout
            └───────────┬───────────┘
                        │ [GENERAL_LEDGER_POSTED]
                        ▼
            ┌───────────────────────┐
            │ 11. DOUBLE-ENTRY JRN  │  Balanced Journal Voucher & Audit Log
            └───────────────────────┘
```

## 3. Architecture & Data Flow
1. **Universal Search Parsing**: The `TraceService` accepts any query string and systematically queries `GateEntry`, `PurchaseOrder`, `GoodsReceipt`, `ProductionBatch`, `SalesOrder`, and `Journal`.
2. **Bi-Directional Graph Construction**:
   - Upstream Traversal: Follows foreign keys back to Supplier, Gate Pass, Scale Ticket, and Lab Moisture Sample.
   - Downstream Traversal: Follows inventory consumption to Milling Batches, Finished Goods Stacks, Sales Invoices, Payments, and General Ledger Journals.
3. **Graph Payload**:
   - `nodes`: List of audited stages with ID, title, identifier code, status, timestamp, metrics, and invariant verification boolean.
   - `links`: Directed edges specifying the relationship (`from`, `to`, `relation`).
   - `summary`: High-level executive aggregates (`totalPhysicalKg`, `totalFinancialBdt`, `overallIntegrity`).

## 4. Database Schema & Models
Leverages relations across:
- `Partner` (Supplier/Customer)
- `GateEntry`, `WeighbridgeTicket`, `QualitySample`
- `PurchaseOrder`, `GoodsReceipt`
- `StockMovement`, `ProductionBatch`, `ProductionOutput`
- `SalesOrder`, `SalesInvoice`, `DeliveryChallan`
- `Payment`, `Journal`, `JournalLine`

## 5. Backend Services & API Endpoints
- **Module**: `backend/src/modules/trace/`
- **Controller**: `TraceController`
- **Endpoint**: `GET /api/trace?query=<term>&companyId=<companyId>`
- **Response Format**: JSend-compliant envelope (`TraceResponseDto`):
```json
{
  "success": true,
  "message": "Transaction trace retrieved successfully",
  "data": {
    "found": true,
    "query": "GT-2026-001",
    "rootStage": "GATE_ENTRY",
    "nodes": [...],
    "links": [...],
    "summary": {
      "totalPhysicalKg": 10000,
      "totalFinancialBdt": 350000,
      "overallIntegrity": "VERIFIED"
    }
  }
}
```

## 6. Frontend Presentation & UI States
- **Page Component**: `frontend/src/app/transaction-trace-page.tsx`
- **Search Header**:
  - Full-width query input with search button and keyboard Enter support.
  - Quick-trace chips for instant lookup: `GT-2026-001`, `PO-2026-001`, `BAT-2026-001`, `SO-2026-001`, `PMT-2026-001`, `BOGURA-METRO-T-11-0101`.
- **Executive Summary Strip**:
  - Overall Integrity (`VERIFIED` shield badge).
  - Physical Volume in KG and Mon (e.g., `10,000 Kg (250.00 Mon)`).
  - Financial Value in BDT (e.g., `৳ 448,000`).
  - Total Stages Linked count.
- **Visual Audit Pipeline**:
  - Sequential cards for each linked stage.
  - Stage icon, badge, timestamp, and metadata breakdown (e.g. Gross/Tare/Net for Weighbridge, Moisture % for Lab, Recovery % for Milling).
  - Connecting directional arrows displaying the transition relation.

## 7. Security & Role-Based Access Control (RBAC)
- Permitted Roles: `OWNER`, `SUPER_ADMIN`, `GENERAL_MANAGER`, `ACCOUNTANT`, `AUDITOR`.
- Restricted Roles: Data entry operators are limited to their operational modules and cannot view corporate financial margins in the trace view.

## 8. Invariants & Financial/Stock Integrity
1. Total gross weight minus tare weight must equal scaled net weight.
2. GRN received quantity must reconcile with PO payable quantity and moisture deductions.
3. Milling batch input raw paddy must equal finished rice + broken rice + bran + process loss.
4. Accounting debits must equal credits.

## 9. Exception & Error Handling
- Invalid / Non-existent Query: Returns `{ found: false, nodes: [], links: [] }` with a friendly "No transaction records found matching the search criteria" message.
- Network / Server Disconnection: Displays local verified audit snapshot with an explanatory alert.

## 10. Seed Scenarios & Verification Tests
- Unit Tests:
  - `backend/src/modules/trace/trace.service.spec.ts` (100% pass).
  - `backend/src/modules/trace/trace.controller.spec.ts` (100% pass).
- Critical Flow Tests:
  - `backend/src/modules/critical-flows.spec.ts` (Flow 1 through 10 verified).

## 11. Localization (English & Bengali)
- Dual language support in all UI labels and status chips:
  - Title: `Transaction Trace & Audit Lineage` / `লেনদেন ট্রেস ও নিরীক্ষা`
  - Stages: `1. Supplier / Farmer` (`১. সরবরাহকারী / কৃষক`), `2. Gate Entry & Pass` (`২. গেট এন্ট্রি ও পাস`), `3. Weighbridge Scaling` (`৩. ওয়েব্রিজ ওজন স্কেল`), etc.

## 12. Operational Runbook & Disaster Recovery
- Auditors can print the complete trace report or export it as a certified PDF audit trail for bank financing, internal audit, and tax authorities.

## 13. Audit & Compliance Checklist
- [x] Backend `TraceService` traverses all 11 supply chain stages.
- [x] Controller `GET /api/trace` protected by `AccessGuard`.
- [x] Unit test coverage verifies node linking and invariant calculation.
- [x] Frontend `TransactionTracePage` integrated into primary navigation with quick chips.
- [x] 100% test pass rate across backend and frontend build pipelines.

