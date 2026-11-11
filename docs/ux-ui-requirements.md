# UX / UI Requirements & Design System

## Status
Complete

## 1. Business workflow
- **Purpose and actors**:
  - The Rice Mill ERP user interface is designed for high-throughput, low-latency industrial operations in grain mills, weighing stations, quality laboratories, accounting offices, and management executive desks.
  - Primary actors include Mill Owners, Plant Managers, Weighbridge Operators, Gate Security, QC Officers, Store Keepers, Millers, Dispatch Clerks, and Accountants.
- **Design Philosophy**:
  - **Professional, Clean, Fast, Simple, Industrial ERP Style**: The interface prioritizes data density, readability, tactile keyboard efficiency, and instant response times over flashy consumer animations.
  - **Zero Distractions**: Strictly avoids excessive gradients, oversized decorative cards, unnecessary transition delays, confusing deeply nested menus, and disruptive popup modals.
  - **Minimum Clicks**: Critical daily tasks (e.g., recording a gross weight, approving a batch, checking inventory, printing an invoice) require 1 to 2 clicks or keyboard shortcuts (`CTRL + K`).
- **Company/factory/location and ownership scope**:
  - Top header persistently displays the active Company and Factory with one-click switcher dropdowns.

## 2. Component System (Material UI)
The interface is built exclusively on **Material UI (MUI v5/v6)** utilizing the following standard design components:
1. **DataGrid & Table**: Server-paginated, sortable, high-density data tables with sticky headers and inline status chips.
2. **Tabs**: Sub-module segmentation (e.g. Overview, Active Batches, Quality Parameters, Audit Trail) allowing instant context switching without page reloads.
3. **Drawer**: Collapsible responsive side navigation with category groupings (`OPERATIONS`, `MANAGEMENT`).
4. **Dialog**: Structured modal forms for targeted transactional entries (New Gate Pass, Weighbridge Ticket, QC Sample).
5. **Stepper & Wizard**: Ordered stage progression for complex multi-step industrial flows (Procurement intake, Parboiling soaking/steaming stages, Production milling runs).
6. **Autocomplete**: Debounced, searchable dropdowns for Partner (Supplier/Customer), Item (Paddy/Rice), Godown/Stack, and Vehicle selection.
7. **Date Range Picker**: Quick filters for Today, Yesterday, This Week, This Month, and custom date bounds.
8. **Search**: Unified global search (`CTRL + K` Spotlight Search across 12 entities) plus table-level filter inputs.
9. **Filters**: Category pills, status chips (`PENDING`, `APPROVED`, `POSTED`), and severity indicators.
10. **Bulk Actions**: Batch approvals, bulk spreadsheet imports, and batch A4 document print queues.

## 3. Relationships & Navigation Hierarchy
- 2-Level shallow navigation tree:
  - Top-level Drawer: Grouped into `OPERATIONS` (Gate, QC, Procurement, Inventory, Production, Sales, Dispatch) and `MANAGEMENT` (Financials, HR, Maintenance, Analytics, System Settings).
  - Page-level Tabs: Domain-specific workflows.
- Breadcrumbs and persistent title bars orient the user with mill name and legal entity.

## 4. Calculations & Formatting
- **Currency & Numbers**:
  - Bangladeshi Taka formatted in South Asian numbering (৳ Crore, Lakh, Thousand) or international format.
  - Physical quantities formatted with metric unit suffix (e.g. `12,450.00 KG`, `311.25 MON`, `12.45 TON`).
  - Dates formatted in localized ISO/BST format (`YYYY-MM-DD HH:mm:ss`).

## 5. Accounting impact
- Double-entry debit/credit lines render in monospace high-contrast fonts (`Roboto Mono` / `Courier`).
- Visual indicator flags unbalanced entries in red immediately.

## 6. Inventory impact
- Real-time stock levels display color-coded status:
  - Green: Healthy stock $> 100\%$ reorder level
  - Orange: Low stock $\le 100\%$ reorder point
  - Red: Critical stock or negative warning

## 7. API & State Integration
- Frontend communicates via typed REST API clients with React hooks and TanStack Query.
- Debounced requests prevent redundant network calls during typing.

## 8. Permissions & Role-Based UI Gating
- UI elements (buttons, edit menus, financial columns) are conditionally rendered based on JWT user roles and permissions:
  - Financial columns (margins, profit, base purchase rates) are hidden for floor operators.
  - Price editing and delete buttons are gated to `MILL_OWNER`, `MANAGING_DIRECTOR`, and `ADMIN`.

## 9. Validation & Error Handling
- **Input Constraints**:
  - Numeric fields enforce non-negative values (`min: 0`).
  - Text fields enforce trimming and length bounds.
  - Required fields highlighted with standard red asterisks.
- **Feedback**:
  - Non-blocking snackbar toast notifications for successful operations (`Saved successfully`).
  - Clear, actionable inline alerts for validation or network errors.

## 10. UI Theme & Visual Guidelines
- **Color Palette**:
  - Primary: Deep Industrial Blue (`#1a365d` / `#1976d2`)
  - Secondary: Slate Teal (`#2c3e50`)
  - Success: Forest Green (`#2e7d32`)
  - Warning: Amber Gold (`#ed6c02`)
  - Error: Crimson Red (`#c53030`)
  - Background: Neutral Off-White (`#f8fafc` / `#ffffff`)
- **Typography**:
  - High-legibility sans-serif (`Inter`, `Roboto`, `system-ui`).
  - Sizing: Body text 13-14px, table cells 12-13px for high information density.
- **Responsive Breakpoints**:
  - Mobile (`xs`: $< 600\text{px}$): Single-column cards, collapsible drawer, touch-friendly buttons.
  - Tablet (`sm`: $600 - 960\text{px}$): 2-column grids, compact tables.
  - Desktop (`md` / `lg`: $> 960\text{px}$): Full multi-column industrial desks with simultaneous sidebar, summary KPIs, and data tables.

## 11. Reports & Printing
- `@media print` optimized stylesheets for A4 paper output (`210mm` $\times$ `297mm`).
- Hides sidebars, appbars, buttons, and pagination controls on print preview.

## 12. Tests
- Automated test suite `backend/src/modules/ux-ui-compliance.spec.ts` auditing:
  - Material UI import verification across all frontend pages.
  - Absence of anti-patterns (no excessive gradients, no huge non-functional cards).
  - Presences of required components: `DataGrid` / `Table`, `Tabs`, `Drawer`, `Dialog`, `Stepper`, `Autocomplete`, `Search`, `Filters`.

## 13. Known limitations & Next steps
- Native dark mode toggle can be provided for night-shift weighbridge operators.

