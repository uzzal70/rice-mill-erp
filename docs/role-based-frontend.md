# Enterprise Role-Based Frontend Experience (#84)

## 1. Overview & Purpose
Promptdoc #84 defines the enterprise UX/UI standards for the Rice Mill ERP frontend. Unlike consumer web applications, an industrial manufacturing ERP requires a dense, reliable, and role-specialized user experience.

The frontend serves distinct user personas: factory owners need consolidated financial and operational intelligence; gate and weighbridge clerks need fast, touch-friendly vehicle check-in screens; accountants need multi-column ledgers and voucher balance verification; and laboratory technicians need moisture test forms with instant deduction feedback.

## 2. Application Shell & Layout
The application shell (`frontend/src/app/page.tsx`) provides:
1. **Collapsible Navigation Sidebar**:
   - Organized into two primary sections: `OPERATIONS` and `MANAGEMENT`.
   - Dynamic visibility filtering based on user permissions.
   - Active state indicators, role badges, and quick-collapse drawer for tablet and mobile devices.
2. **Top Navigation Bar**:
   - Company Selector: Displays authorized legal entities (`ABC Rice Industries Ltd.`).
   - Factory Selector: Switches active operational facility (`Bogura Auto Mill`, `Naogaon Parboiled Mill`).
   - Universal Search Trigger: One-click or `Ctrl + K` shortcut to launch `GlobalSearchDialog`.
   - Notification Bell: In-app badge showing pending approvals and operational alerts.
   - Dual Language Toggle: Instant one-click switch between English and Bengali (`বাংলা`).
   - User Profile & Security: Session status, user email, role name, and sign-out controls.
3. **Workspace Content Area**:
   - Standardized page header with brand font title and contextual subtitle.
   - Live operational KPI cards, filters, and high-density data tables.
   - Responsive Material UI v6 grid system.

## 3. Dedicated Role-Based Workspaces

### 3.1 SUPER_ADMIN
- System health, tenant onboarding, database backup triggers, and global role permissions (`RolesPage`, `BackupPage`).

### 3.2 OWNER / DIRECTOR
- Executive command center (`OwnerDashboardPage`, `ManagementAnalyticsPage`, `TransactionTracePage`, `MobileOwnerPage`).
- 8 strategic KPIs, 8 visual SVG charts, 16 core business metrics, 1-tap manager approvals.

### 3.3 GENERAL_MANAGER
- Multi-factory operational comparison, pending approval queues, delayed dispatches, and daily production reports (`DashboardPage`, `ApprovalsPage`).

### 3.4 FACTORY_MANAGER
- Factory-specific equipment logs, machine runtime hours, shift throughput, breakdown tickets, and safety alerts (`MachinesPage`, `ProductionPage`).

### 3.5 PURCHASE_MANAGER / OFFICER
- Supplier & farmer directory, grain broker contracts, moisture policies, purchase orders, and landed freight vouchers (`ProcurementPage`, `MoisturePolicyPage`, `LandedCostPage`).

### 3.6 GATE_OPERATOR
- Fast, high-contrast vehicle check-in/out register (`GatePage`).
- Inward grain trucks, outward customer dispatches, driver contact info, and security gate pass printing.

### 3.7 WEIGHBRIDGE_OPERATOR
- Gross weight (first scale), tare weight (second scale), bag deduction, and net grain calculation (`GatePage`, `WeighbridgeTicket`).

### 3.8 LAB_TECHNICIAN
- Quality sample queue, moisture meter reading, foreign matter %, damaged grain %, and Accept/Reject decisions (`QualityControlPage`).

### 3.9 STORE_MANAGER
- Godown and stack visual occupancy, physical stock ledger, sack inventory, and movement history (`WarehousePage`, `StockLedgerPage`, `PackagingMasterPage`).

### 3.10 PRODUCTION_MANAGER / OPERATOR
- Soaking and parboiling logs, drying yard moisture curves, milling recovery %, head rice bagging, and bran yields (`ParboilingPage`, `DryingPage`, `ProductionPage`).

### 3.11 ACCOUNTS_MANAGER / ACCOUNTANT
- Double-entry journals, cash/bank books, supplier payables, customer receivables, expense vouchers, and financial statements (`AccountingPage`, `ExpensesPage`, `ProfitabilityPage`).

### 3.12 SALES_MANAGER / OFFICER
- Commercial sales orders, wholesale pricing lists, customer credit limits, and delivery challans (`SalesPage`, `DispatchPage`, `SalesReturnPage`).

## 4. Dynamic RBAC & Sensitive Metric Masking
- Action-level permissions (`CREATE`, `READ`, `UPDATE`, `DELETE`, `APPROVE`, `POST`, `VIEW_FINANCIAL`).
- **Sensitive Data Masking**: If a user lacks the `VIEW_FINANCIAL` permission, cost per KG, profit margins, and supplier purchase rates are completely masked (`—` or hidden) in both frontend tables and backend API payloads.

## 5. Backend Services & Integration
- `AccessGuard` evaluates user memberships and active factory IDs on every API request.
- Frontend fetch utility `apiRequest<T>()` automatically injects Bearer JWT and catches authorization errors.

## 6. Frontend Presentation Standards
- Built strictly with React 19 and Next.js 16 (App Router).
- Clean, semantic JSX with zero direct business calculation.
- Responsive breakpoints: `xs` (mobile phone), `sm` (tablet), `md` (laptop), `lg` (desktop workstation).

## 7. Security & Role-Based Access Control (RBAC)
- Client-side route guarding supplemented by strict NestJS controller guards.
- Tamper-proof session storage with automated logout on token expiration.

## 8. Invariants & Financial/Stock Integrity
- Role switches immediately refresh current factory context and reset cached data.
- Read-only users cannot trigger action modals.

## 9. Exception & Error Handling
- Permission denied responses render clear feedback: "You do not have permission to perform this action."
- No silent failures; errors displayed in dismissible alerts.

## 10. Seed Scenarios & Verification Tests
- Frontend typecheck passes with 0 errors (`npm --prefix frontend run typecheck`).
- Production build compiles in <2 seconds (`npm --prefix frontend run build`).
- UI compliance tests passing in `backend/src/modules/ux-ui-compliance.spec.ts`.

## 11. Localization (English & Bengali)
- Dual language support in every role view, navigation item, and table column header.
- Dynamic font scaling for clear Bengali script readability.

## 12. Operational Runbook & Disaster Recovery
- Offline cache resilience for gate and scale operations during brief network disruptions.

## 13. Audit & Compliance Checklist
- [x] Application shell with collapsible sidebar and top navigation.
- [x] Dedicated workspaces for all 10 standard roles.
- [x] Action-level RBAC permission filtering.
- [x] Sensitive financial data masking for operational roles.
- [x] 100% build and typecheck pass rate.

