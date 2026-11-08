# Research basis

## Purpose and method

This note records the public-source research for section 1 of `docs/promtdoc`. It uses publicly accessible vendor pages only to identify general rice-mill ERP workflow concepts. It does not reproduce vendor code, private implementation details, product branding, or UI assets. Vendor-published statements are treated as claims, not independently verified product behavior.

Research checked on 2026-11-01. The four names in the prompt do not all resolve to equally specific, accessible product documentation; evidence and limitations are recorded separately rather than filling gaps with assumptions.

## Sources and evidence

| Reference | Public source checked | What the source supports | Evidence limits |
|---|---|---|---|
| Smart Software Ltd. | [Rice Mill Management Software](https://www.smartsoftware.com.bd/rice-mill-management-software) | The page lists raw-material purchase management, production issue and receipt, inventory and warehouse management, bag inventory, sales and order management, customer/supplier ledgers, accounting and financial reports, and inventory-ledger management. These support a broad purchase → production → stock → sales → ledger/reporting workflow as a set of module concepts. | The page title refers to an “Auto Flour Mill” while its body also describes an “Auto Rice Mill Management System.” Later sections include garment/apparel-specific language (for example yarn booking and knitting programs). Treat the rice-mill feature list as vendor-published, but do not attribute every page section to rice milling. The page does not substantiate all detailed requirements in the master prompt. |
| JaMi-iT | [JaMi-iT official homepage](https://jamiit.com/) | The current homepage describes a Dhaka-based software company and mentions deployments for “mills & enterprises.” It describes general capabilities such as multi-branch inventory, supply chain, POS, billing, and financial accounting. | This is broad company and service information, not documentation of a particular rice-mill workflow or feature set. An older URL, [services_page.php](https://jamiit.com/services_page.php), returned 404 when checked; it is not used as evidence for product features. |
| RiceERP | [Search for “RiceERP” rice mill software](https://www.bing.com/search?q=%22RiceERP%22+rice+mill+software) | No clearly attributable official RiceERP product documentation was verified in this research pass. | A search result is not proof that the product does not exist. The name may be ambiguous, differently styled, or not publicly indexed. No workflow feature is attributed to RiceERP here. |
| Labib IT | [Search for “Labib IT” rice mill ERP in Bangladesh](https://www.bing.com/search?q=%22Labib+IT%22+rice+mill+ERP+Bangladesh) | No clearly attributable official Labib IT rice-mill product documentation was verified in this research pass. | Search results were not sufficient to establish the exact vendor/product or its workflows. This is an evidence gap, not proof that no such product exists. No workflow feature is attributed to Labib IT here. |

## Workflow concepts used as domain context

Only the following high-level concepts are supported by the accessible rice-mill-specific feature list or are cautious synthesis of the listed modules:

1. Track raw-material purchasing.
2. Record production issues and receipts.
3. Keep inventory and warehouse operations visible, including packaging/bag stock.
4. Connect orders and sales to customer/supplier ledger views.
5. Provide accounting and financial/inventory reporting.

These are generic ERP concepts, not a reconstruction of any vendor’s implementation. The ERP’s detailed domain requirements—such as gate entry, gross/tare weighbridge, quality approval, configurable moisture policies, stack capacity, batch recovery, double-entry posting, tenant isolation, and reversal/audit behavior—must be designed and validated as this project’s own requirements. The sources above are not cited as evidence that the named vendors implement those detailed behaviors.

## Design and implementation safeguards

- Use the source concepts only to check that major operational areas are represented; do not copy source code, proprietary workflows, text, visual design, or brand assets.
- Build original workflows around the project’s documented business rules, including stock and accounting effects, permissions, approvals, audit history, and corrections.
- Keep vendor claims distinct from verified project behavior. Document project-specific limitations and test calculations and posting rules against the project’s own requirements.
- Revisit the unverified RiceERP and Labib IT references only if an attributable public source becomes available; do not infer missing capabilities from their names.
