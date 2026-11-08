# By-product Cost Offset

## Status
Designed; implementation awaits production cost (#32), sales (#35), sales return (#38), and batch-level inventory valuation/traceability.

## 1. Business workflow
- For a posted milling batch, show gross production cost and eligible realized revenue from its saleable co-products.
- Eligible outputs include bran, husk, rice polish, broken rice, and other configured by-products. Broken rice remains a rice output for recovery calculations; this module may also treat its realized sale as a co-product credit as required by #33.
- Revenue is recognized as an offset only after an actual sales document is posted. Item-master sales prices are reference values, never realized revenue.
- Sales returns reduce the revenue credit. Posted calculations are immutable and require reversal/recalculation when a source sales posting is reversed.
- A batch output can be mixed with other stock through transfers or sales. Revenue must be attributed from valued inventory layers or explicit batch/lot lineage; do not allocate sales to a production batch arbitrarily.

## 2. Database entities
- Planned `ProductionCostOffset`: production batch, cost sheet, output item, source posted sales/return documents, gross realized amount, return reduction, net eligible revenue, calculation time, state, and actor.
- A source allocation table must preserve the sales line/return line and inventory layer quantity and value credited to each batch.
- Migration pending. This entity cannot be safely added until the sales line schema and inventory valuation layer model are available.

## 3. Relationships
- Cost offset references one posted production cost sheet, same company/factory, and posted sales/return lines for the batch's actual outputs.
- ProductionOutput, inventory depletion and sales-line relationships must preserve batch/lot lineage across transfers and split sales.

## 4. Calculations
- Gross production cost = posted batch cost from #32.
- Eligible net co-product revenue = sum of actual posted sale-line amounts for tracked batch outputs minus posted sales-return amounts.
- Net rice production cost = gross production cost − eligible net co-product revenue.
- Keep gross and net values visible. Do not clamp a negative result without an approved accounting rule; disclose revenue credits that exceed gross production cost.
- Tax, discount allocation, freight/commission deduction, and whether to use invoice net before tax remain policy questions. Calculations must use stored source amounts, not current item reference prices.

## 5. Accounting impact
- This is a production-cost allocation/reporting credit, not new sales revenue. The underlying sales invoice already recognizes revenue; cost offset credits the batch's co-product cost allocation.
- Journal treatment must be defined with #32 production accounting and the chart-of-accounts mappings. Do not post duplicate revenue.

## 6. Inventory impact
- No quantity movement. Actual sales and returns post their own stock movements. Cost attribution follows those source movements/layers.
- Without batch/lot valuation lineage through transfer, inventory mixing, and dispatch, no offset can be attributed reliably.

## 7. API
- Planned batch offset calculation/read and reconciliation routes; reads include gross cost, each source sales/return allocation, net offset, and net production cost.
- Calculation is idempotent by batch and source revision; source reversals invalidate/reverse the prior offset.

## 8. Permissions
- Production cost report/read requires `production:READ` plus `VIEW_FINANCIAL`. Calculation/post requires production approval/post and financial view. Sales source visibility remains subject to sales permissions.

## 9. Validation
- All source sale/return lines must be posted, same company/factory, and traceable to the production output through inventory layers. Do not count the same line twice or offset more quantity than was produced/sold/returned.
- Return amounts cannot exceed the corresponding posted sale allocation.

## 10. UI
- Planned bilingual cost report showing gross production cost, co-product revenue by item/source, returns, net offset, and net rice production cost with trace-through links.

## 11. Reports
- Batch profitability/cost-offset register by factory, date, product, and source sale; reconcile to sales subledger, inventory layers, production cost, and GL.

## 12. Tests
- Required: source attribution through split/transfer/mixed stock, return bounds, duplicate prevention, posted-source restrictions, decimal reconciliation, tenant boundaries, accounting balance, and reversal.

## 13. Implementation and verification
- No offset code exists. Current by-product master reference prices are explicitly not treated as actual revenue.
- Remaining: implement #32 cost/valuation foundation, #35/#38 sales/return line sources, inventory batch layer attribution, and approved tax/discount/freight policy before this workflow can post.
