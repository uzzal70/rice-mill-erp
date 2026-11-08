# Multi-factory operations

## Data and scope

A company can register multiple factories. Each factory has its own production type and business modes, and owns its godowns, stacks, and production lines. Operational records—including gate entries, weighbridge tickets, quality samples, purchases/GRNs, stock movements, and production/drying/parboiling batches—carry company and factory scope. Composite database constraints and service validation prevent those records from referencing a factory, location, stock item, or reversal from another company or factory.

Company-wide master data such as partners and items is shared inside one company. Stock is not shared across companies; transfers are only between stacks in the same factory. Inter-factory stock transfers are not enabled by the current inventory workflow.

## Factory and line setup

- `GET/POST /factories` lists or creates factories within the authenticated company scope.
- `GET /godowns?companyId=...&factoryId=...` lists a factory's godowns and stacks with ledger-derived occupancy.
- `POST /godowns` and `POST /stacks` create factory-scoped warehouse locations after validating their parent.
- `GET /production-lines?companyId=...&factoryId=...` lists active lines for one factory.
- `POST /production-lines` creates a line after verifying that its factory belongs to the requested company. Line codes are unique within each factory; creation is audited.
- `GET /dashboard/factory-comparison?companyId=...&factoryId=...` returns operational comparison counts for one factory. The factory filter is optional for company-level owner/report access; the dashboard UI requests factories individually so users with factory-scoped roles only see factories they can access.

Factory-scoped users can only use routes for factories in their active memberships. Company-level owners can administer and compare across the company's factories. Client-supplied company/factory IDs are checked by the access guard and services and are additionally constrained by database relationships.

## Owner dashboard and comparison

The global factory selector provides the detailed operational view for the selected factory. The dashboard also compares active factories that the current user is authorized to access using `GET /dashboard/factory-comparison?companyId=...&factoryId=...`. The UI requests each factory separately so factory-scoped users do not receive data for factories outside their memberships.

The current comparison contains gate-entry count, open gate count, open purchase count, unposted receipt count, and positive item/stack stock-position count. These are current operational counts, not daily totals, production yield, sales, finance, or profitability metrics. Those comparisons require their later operational and accounting modules.

## Remaining scope

Production lines are configurable, but production batches do not yet reference a line. Machine registry/assignment belongs to the machine-management work. Weighbridge tickets are factory-scoped and support multiple tickets per factory; a separate weighbridge-device registry/integration is not yet implemented. Full owner comparison of production, sales, cash/bank, profit, stock valuation, and working capital is not implemented.
