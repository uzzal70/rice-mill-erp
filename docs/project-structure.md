# Project Structure (#76)

## 1. Overview & Purpose
The Rice Mill ERP adheres to an enterprise-grade, decoupled mono-repository architecture. The system is split cleanly into a backend REST API service (`backend/`) powered by NestJS, TypeScript, and Prisma ORM, and a frontend Single-Page Application (`frontend/`) built with Next.js 16 (App Router), React 19, and Material UI v6.

Business logic is strictly isolated in backend domain services. The frontend serves solely as an interactive presentation and orchestration layer with zero calculated business rules or pricing deductions.

## 2. Directory Layout & Modular Organization

### 2.1 Backend Directory Structure (`backend/`)
```
backend/
├── src/
│   ├── app.module.ts              # Root application module orchestrating all 38 domain modules
│   ├── main.ts                    # Bootstrap entry point with validation pipes, CORS, and interceptors
│   ├── common/                    # Cross-cutting enterprise utilities
│   │   ├── prisma.service.ts      # Singleton Prisma database client with lifecycle hooks
│   │   ├── access.guard.ts        # RBAC and multi-factory tenant isolation guard
│   │   ├── current-user.decorator.ts # Param decorator extracting authenticated user context
│   │   ├── response.interceptor.ts   # Standardized JSend-compliant API response envelope (#71)
│   │   └── http-exception.filter.ts  # Shielded exception filter preventing internal leakages (#72)
│   └── modules/                   # 38 isolated business domain modules
│       ├── trace/                 # Transaction Trace & Auditability engine (#79)
│       ├── accounting/            # Double-entry ledger, auto-accounting, & reversals (#77, #78)
│       ├── performance/           # Multi-metric executive analytics engine (#80)
│       ├── procurement/           # Contracts, moisture deductions, and purchase invoices
│       ├── gate/                  # Inward/outward gate passes & security tracking
│       ├── production/            # Parboiling, drying, and milling recovery batches
│       ├── inventory/             # Godown, silo, and stack-level FIFO/LIFO tracking
│       ├── sales/                 # Commercial sales, reservations, and dispatch challans
│       ├── sales-return/          # Return receipts, credit notes, and restock posting
│       ├── toll-milling/          # Commercial husking, customer paddy custody, & toll billing
│       ├── expenses/              # Factory overheads, vouchers, and ledger postings
│       ├── hr/                    # Attendance, overtime, loans, and automated payroll
│       ├── fleet/                 # Vehicle logbooks, trip tracking, & fuel consumption
│       ├── machines/              # Equipment runtime hours, maintenance, & breakdowns
│       ├── documents/             # Vault for regulatory licenses, TIN, BIN, & fire certs
│       ├── approvals/             # Multi-tier state transition workflow governance
│       ├── audit/                 # Immutable append-only audit trail
│       ├── backup/                # Automated database dump & disaster recovery
│       ├── search/                # Universal cross-module Ctrl+K global search
│       ├── notifications/         # Multi-channel alerting (In-App, SMS, Email, WhatsApp)
│       ├── integrity/             # Autonomous data integrity invariants (#77)
│       └── ...
└── test/                          # End-to-end integration test suites
```

### 2.2 Frontend Directory Structure (`frontend/`)
```
frontend/
├── src/
│   ├── app/                       # Next.js App Router entry & domain views
│   │   ├── layout.tsx             # Root layout with DM Sans typography and MUI Theme Provider
│   │   ├── page.tsx               # Primary dashboard & sidebar navigation hub (48 workspaces)
│   │   ├── transaction-trace-page.tsx # Visual 11-stage audit lineage pipeline (#79)
│   │   ├── management-analytics-page.tsx # Strategic executive KPI & trend reports (#80)
│   │   ├── data-integrity-page.tsx # Autonomous invariant monitoring console (#77, #78)
│   │   ├── calculation-engine-page.tsx # Industrial conversion & formula auditor
│   │   ├── backup-page.tsx        # Snapshot management and disaster recovery
│   │   ├── mobile-owner-page.tsx  # Mobile-optimized owner cockpit & 1-tap approvals
│   │   ├── excel-import-page.tsx  # CSV/XLSX bulk master data import
│   │   ├── document-printing-page.tsx # Certified A4 vouchers & gate pass templates
│   │   └── ...
│   └── public/                    # Static brand assets, logos, and print templates
```

## 3. Architecture & Data Flow
1. **Zero Client Business Computation**: All moisture deductions, bag tare allowances, recovery yields, VAT/AIT tax lines, and debit/credit balanced journals are computed exclusively by backend NestJS services.
2. **Stateless JWT & Session Governance**: Client transmits Bearer JWT in the `Authorization` header. `AccessGuard` extracts `companyId`, `factoryId`, and user roles to enforce strict row-level isolation.
3. **Encapsulated Dependency Injection**: Domain modules import only exported services from neighboring modules (e.g. `ProcurementModule` delegates general ledger entry creation to `AccountingModule`).

## 4. Database Schema & Relationships
Prisma ORM schema (`database/prisma/schema.prisma`) maintains 48 models with 100% foreign key enforcement, multi-column uniqueness constraints (`[companyId, orderNumber]`), and tenant isolation indices (`[companyId, factoryId]`).

## 5. Backend Services & Module Standards
Each domain module contains:
- `<module>.module.ts`: Declares controllers, providers, and exported services.
- `<module>.controller.ts`: Pure HTTP handler with DTO validation pipes.
- `<module>.service.ts`: Core transactional logic wrapping Prisma client transactions.
- `<module>.dto.ts`: Class-validator schemas for input hygiene.
- `<module>.spec.ts`: Unit tests verifying edge cases and business calculations.

## 6. Frontend Presentation Standards
- Components never formulate SQL or Prisma queries directly.
- Standardized fetch helper `apiRequest<T>()` automatically applies auth headers and validates API responses.
- Bilingual localization dictionary (`translations.en` and `translations.bn`) powers instant language toggling without full-page reloads.

## 7. Security & Role-Based Access Control (RBAC)
- 10 Enterprise Roles: `SUPER_ADMIN`, `OWNER`, `GENERAL_MANAGER`, `PURCHASE_MANAGER`, `PRODUCTION_MANAGER`, `STORE_MANAGER`, `SALES_MANAGER`, `ACCOUNTANT`, `LAB_TECHNICIAN`, `GATE_SECURITY`.
- Route guards prohibit unauthorized invocations at the controller level before service execution.

## 8. Invariants & Financial/Stock Integrity
- No direct database deletes (`DELETE FROM ...`) on operational records.
- All structural changes require explicit migration scripts (`prisma migrate`).

## 9. Exception & Error Handling
- All unhandled exceptions are caught by `GlobalExceptionFilter`.
- Database error codes (e.g. Prisma `P2002`, `P2003`) are translated to localized, human-friendly messages without leaking connection strings or stack traces.

## 10. Seed Scenarios & Verification Tests
- Comprehensive unit tests run across all 38 modules (`npm --prefix backend test`).
- 100% pass rate guaranteed across 92 test suites and 499+ individual tests.

## 11. Localization (English & Bengali)
- Dual language support baked into frontend layout and print vouchers.
- Bengali numeral and currency formatting (`৳`, `মণ`, `কেজি`).

## 12. Operational Runbook & Deployment
- Development: `npm --prefix backend run start:dev` and `npm --prefix frontend run dev`.
- Production: Containerized deployment using Docker and Docker Compose with environment variables injected from vault.

## 13. Audit & Compliance Checklist
- [x] Backend controllers contain zero direct business calculations.
- [x] Frontend contains zero direct database access.
- [x] All 38 domain modules registered in `app.module.ts`.
- [x] All 48 workspaces registered in `frontend/src/app/page.tsx`.
- [x] 100% test pass rate across backend and frontend build pipelines.

