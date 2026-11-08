# Broker Master

## Workflow

Create a broker profile with a required commission basis and positive commission rate. Supported bases are per KG, per Mon, per Ton, percentage, and fixed amount. Commission terms are financial data: broker creation requires both partner-create and financial-view permissions; commission changes use the protected partner financial endpoint. Broker identity is company-scoped, searchable, paginated, and can be activated or deactivated.

## Calculation and accounting boundary

When creating a purchase order with a broker selected, the system snapshots the broker ID, commission type, and rate on that purchase order and calculates a commission amount from the weighed KG quantity and purchase rate:

- Per KG, Per Mon, and Per Ton: convert the measured KG quantity using the company's effective-dated unit conversion graph, then multiply by the configured rate.
- Percentage: apply the percentage to `net weight × purchase rate`.
- Fixed amount: use the configured amount once for the purchase order.

The amount and source terms are part of the audited purchase-order record and are not changed if the broker's master terms later change. Missing required unit conversions reject the purchase rather than substituting a hard-coded factor. Commission remains a calculated purchase-order cost, not a supplier payment or posted accounting journal; accounting accrual/payment are handled in their later transaction phases.

## API and permissions

- `GET /api/v1/partners?type=BROKER` lists broker profiles; `partners:READ` is required.
- `POST /api/v1/partners/brokers` creates a broker and commission terms atomically, requiring both `partners:CREATE` and `partners:VIEW_FINANCIAL`.
- `PATCH /api/v1/partners/:id` updates broker identity/status and requires `partners:UPDATE`.
- `GET/PUT /api/v1/partners/:id/financial` reads/updates commission terms; update requires both `partners:UPDATE` and `partners:VIEW_FINANCIAL`.
- Purchase-order creation accepts an optional `brokerId`; the selected active company broker and effective-dated unit conversion rules are validated inside the purchase transaction.
- Percentage commission is limited to 100%; all commission rates must be positive. Records and audit events are scoped to the company.

## UI and verification

The bilingual Broker Master provides search, status filtering, commission-basis creation/editing, protected commission reads and updates, and activate/deactivate controls. Procurement can select an optional broker and displays the saved commission amount. Tests cover commission formulas/conversion, missing conversion behavior, purchase-order snapshots, profile validation, audit, and permission metadata.
