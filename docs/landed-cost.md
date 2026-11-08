# Landed Cost

## Status
Backend and UI implemented; migration is written but not applied to a database. Scope remains partial because reports/export and inventory valuation integration are not implemented.

## 1. Business workflow
- Purpose: calculate the actual paddy acquisition cost for each posted goods receipt, including configurable direct cost components.
- Actors: purchase/accounting staff create a calculation; users with procurement approval approve it; posting requires procurement post permission.
- Preconditions: the linked GRN is posted and its purchase order is approved; quantity and purchase terms are immutable source snapshots.
- Workflow: create draft calculation → approval → post. Drafts are immutable after creation in this release. Posted calculations are immutable. Corrections require a future reversal/recalculation workflow.
- Scope: one company, factory, and GRN; direct costs are allocated only across that GRN in this first implementation.

## 2. Database entities
- `LandedCostComponentConfig`: company-wide or factory-specific named component, active/required flags, stable code, and component type.
- `LandedCost`: one snapshot per GRN, with component lines, source quantity, purchase cost, total cost, per-KG/Mon/Ton costs, creator/calculator and approval/post metadata.
- Enforce unique component codes per company and one landed-cost record per GRN. Component values are non-negative BDT amounts; retain source and calculation snapshots.
- Migration: `0020_landed_cost` (application pending).

## 3. Relationships
- Each calculation belongs to the same company/factory as its posted GRN and purchase order. Optional purchase invoice linkage must match those scopes.
- GRN and purchase order are source records; landed-cost deletion is prohibited after posting.

## 4. Calculations
- Purchase cost = posted supplier invoice gross amount when one exists; otherwise GRN physical quantity × purchase-order adjusted rate (the rate reflects the configured moisture policy).
- Landed total = purchase cost + sum of active direct cost component amounts.
- Per KG = total / physical received KG. Per Mon and per Ton use the company's effective unit-conversion graph; missing/ambiguous conversions fail rather than use a hidden constant. Division uses decimal arithmetic and rounds stored rates to four decimal places.
- Components are configurable by company/factory; built-in types include transport, loading, unloading, commission, drying, and other direct costs. Required active components must be supplied, even when their amount is zero.
- This first release does not distribute cost across multiple GRNs or later allocate additions to remaining inventory after some stock is consumed; it records receipt-level cost analysis only.

## 5. Accounting impact
- The calculation is an analysis record only. It does not create a supplier payable or journal until accounting automation is implemented.
- Currency follows the company currency; production currently defaults to BDT. No tax treatment is inferred.

## 6. Inventory impact
- No quantity movement. The existing GRN stock movement retains its original purchase-order rate until a future valuation workflow is designed. Landed cost must not silently rewrite posted movements.

## 7. API
- `GET/POST /landed-cost/components` — list active components for a company/factory and add scoped configuration.
- `GET/POST /landed-cost` — paginated list and draft calculation from a posted GRN.
- `POST /landed-cost/:id/approve`, `POST /landed-cost/:id/post` — conditional state transitions.
- State changes are conditional and audited; duplicate GRN calculations are rejected.

## 8. Permissions
- Existing `procurement:READ/CREATE/APPROVE/POST` plus `procurement:VIEW_FINANCIAL`; company/factory scope required.

## 9. Validation
- Reject unposted GRNs, mismatched company/factory/order/invoice links, inactive/unconfigured components, missing required components, negative/invalid amounts, duplicate posted calculations, and non-positive receipt quantities.

## 10. UI
- Bilingual landed-cost desk with component creation, posted-GRN selection, calculation, approval/post actions, and state/error displays. Component edit/deactivation is not present.

## 11. Reports
- Receipt landed-cost register with GRN, supplier, physical KG, purchase cost, component totals, landed total, per-KG/Mon/Ton costs, status, and factory/date filters. Export and print remain to be implemented.

## 12. Tests
- Required: decimal calculations/rounding; required and optional components; tenant/factory boundaries; permissions; GRN state validation; duplicate/concurrent creation; immutable posted records; audit and report scoping.

## 13. Implementation and verification
- Files/modules changed: `database/prisma/schema.prisma`, migration `0020_landed_cost`, procurement API DTO/controller/service/module, goods-receipt list relation, bilingual UI and task documentation.
- Migration applied/verified: Prisma Client generation validates the data model; SQL migration is not applied because no configured PostgreSQL connection was available.
- Implemented scope: configurable components can be added; receipt calculations snapshot component amounts, calculate purchase and landed totals/per-KG/per-Mon/per-Ton using company conversions, audit create/approve/post, and link an optional posted supplier invoice. Stock movements and accounting journals are unchanged.
- Verification: backend build and frontend typecheck pass. Automated tests were not run.
- Remaining gaps: migration application, tests, component edit/deactivation, draft correction/reversal, inventory valuation allocation, accounting entries, export/print, and report reconciliation.
