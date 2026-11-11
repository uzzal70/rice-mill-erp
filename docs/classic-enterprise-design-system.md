# Classic Enterprise Design System (#86)

## 1. Overview & Purpose
Promptdoc #86 mandates a timeless, professional, industrial-grade design system tailored for commercial rice mills, factory control rooms, and accounting departments. 

The interface eschews consumer web gimmicks (such as neon gradients, glassmorphism, oversized cards, and decorative animations) in favor of high information density, strong contrast, clear typographic hierarchy, keyboard accessibility, and dual-language (English and Bengali) clarity.

## 2. Visual Language & Design Tokens

### 2.1 Color Palette Tokens
Centralized in `frontend/src/app/page.tsx` via Material UI `createTheme`:
- **Primary Brand**: `#1b6a4a` (Deep forest grain green) / Dark: `#104c36`.
- **Secondary Accent**: `#e4b85e` (Golden paddy amber).
- **Surface & Backgrounds**:
  - Application Background: `#f5f8f5` (Light neutral sage gray).
  - Work Surfaces (Cards, Tables, Drawers): `#ffffff` (Pure crisp white).
  - Sidebar Background: `#173e2e` (Dark industrial forest green).
- **Semantic State Colors**:
  - Success: `#378867` (Operational completed, approved, posted).
  - Warning: `#c88a32` (Pending approval, weighing queue, lab testing).
  - Danger / Error: `#d32f2f` (QC rejection, over-credit limit, cancelled).
  - Info: `#0288d1` (Audit logs, system telemetry, notes).
- **Text Contrast**:
  - Primary Text: `#0f172a` (High-contrast slate black).
  - Secondary Text: `#475569` (Slate gray).
  - Disabled Text: `#94a3b8` (Muted silver).

### 2.2 Typography & Density Standards
- **Font Family**: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Heading Scale**: `h4` (24px, -1.2px letter-spacing), `h5` (20px), `h6` (16px, 700 weight).
- **Data Densities**:
  - Compact Table Row Height: 36px (for high-volume journals, stock movements, and weighing queues).
  - Standard Table Row Height: 48px.
  - Form Control Height: 40px (size="small") and 48px (size="medium").
- **Border Radius**: 12px for cards and dialogs; 8px for chips and buttons; 6px for text inputs.

## 3. Architecture & Presentation Flow
```
┌────────────────────────────────────────────────────────┐
│                   Next.js Application                  │
│       ThemeProvider (DM Sans, Palette, Component Rules)│
└───────────────────────────┬────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│        Application Shell      │   │     Density-Aware Tables      │
│  - Collapsible Sidebar        │   │  - Sticky Headers             │
│  - Multi-Factory Selector     │   │  - Server-Side Pagination     │
│  - Universal Search (Ctrl+K)  │   │  - Semantic Status Chips      │
│  - Quick Language Switcher    │   │  - Numeric/Mon Alignments     │
└───────────────────────────────┘   └───────────────────────────────┘
```

## 4. Tables and Data Grids
- **Server-Side Pagination**: Capped at 100 items per page with deterministic cursor and skip/take sorting.
- **Sticky Column Headers**: Table headers remain visible during continuous vertical scrolling.
- **Numeric Alignment**: Quantities (KG, Mon) and monetary amounts (BDT/৳) are strictly right-aligned with monospace formatting (`fontFamily: monospace`).
- **Semantic Status Chips**: Color-coded chips (`statusColor(value)`):
  - Green: `COMPLETED`, `APPROVED`, `POSTED`, `RECEIVING`.
  - Amber: `ENTRY`, `WEIGHING`, `QUALITY`, `DRAFT`, `SUBMITTED`.
  - Red: `REJECTED`, `CANCELLED`.
- **Summary Footers**: Tables calculate running totals for gross weight, tare weight, net weight, bag counts, and financial balances.

## 5. Forms and Transaction Entry
- **Logical Field Grouping**: Forms separate logistics header, partner information, items table, and landed deductions into clear visual cards.
- **Keyboard Navigation**: Standard `Tab` index progression with `Enter` submission on query inputs.
- **Client Validation & Instant Recalculation**: Input fields compute live preview values (e.g., Net Weight = Gross - Tare; Payable KG = Ordered KG - Moisture Deduction) while the backend authoritatively re-validates and enforces invariant calculations upon commit.
- **Confirmation Guards**: Destructive actions (reversals, rejections, cancellation) require explicit confirmation dialogs with mandatory reason entry.

## 6. Transaction Detail Views
Every core business transaction provides:
- Primary header badge with Document Number, Date, Status, and Factory.
- Summary KPI banner (Weight in KG/Mon, Value in ৳).
- Complete 11-stage visual lineage graph in `TransactionTracePage`.
- Action buttons dynamically controlled by permissions: `Approve`, `Post`, `Print`, `Reverse`.
- Full audit history drawer displaying actor ID, timestamp, and diffs.

## 7. Security & Role-Based Access Control (RBAC)
- Sensitive financial metrics (margins, unit costs, profit) automatically hidden or masked (`—`) for field roles lacking `VIEW_FINANCIAL` permission.
- Unauthorized action buttons (e.g. `Approve` for weighbridge clerks) are omitted from the DOM.

## 8. Invariants & Financial/Stock Integrity
- Form inputs disable double-submission via loading spinners (`busy` state).
- Form inputs automatically validate boundary conditions (e.g. Tare Weight < Gross Weight; Net Weight > 0).

## 9. Exception & Error Handling
- Field-level validation highlights input borders in red with descriptive helper text.
- Global alerts catch network drops and server errors gracefully.

## 10. Seed Scenarios & Verification Tests
- Verified in `backend/src/modules/ux-ui-compliance.spec.ts`:
  - Density and accessibility checks.
  - Status tag color consistency.
  - Currency formatting precision.

## 11. Localization (English & Bengali)
- Dynamic switching between English and Bengali across all 49 workspaces.
- Support for Bangla numerals and localized terminology (`মণ`, `কেজি`, `৳`).

## 12. Operational Runbook & Disaster Recovery
- Responsive layouts adapt seamlessly to 10-inch factory floor Android tablets, weighbridge touch displays, and executive desktop monitors.

## 13. Audit & Compliance Checklist
- [x] Neutral, business-focused color palette with high text contrast.
- [x] Standardized typography, density tokens, and Material UI theme.
- [x] Right-aligned numeric columns in data grids.
- [x] Bilingual UI labels with zero hard-coded strings.
- [x] 100% test pass rate across UX compliance suites.
