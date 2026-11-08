# Supplier and Farmer Master

## Workflow

Create a company-scoped supplier or farmer profile before it is selected in gate and procurement workflows. A profile stores identity and contact fields, business name, address, NID, TIN/BIN, and active status. Financial defaults are viewed and edited separately from the ordinary profile so bank details, credit limit, payment terms, and opening balance remain behind financial permissions.

## Data and validation

- `Partner.type` distinguishes `SUPPLIER` and `FARMER`; partner code is unique within its company and normalized to uppercase.
- Optional identity/contact fields can be cleared during profile updates. Financial data can be cleared only through the protected financial endpoint.
- Broker commission fields are reserved for broker profiles and are not exposed in this screen.
- Financial defaults and opening balance are audited, but editing an opening balance does not itself post an accounting journal.
- The protected purchase ledger lists posted goods receipts and computes their gross purchase value from received quantity multiplied by the approved purchase-order rate. It excludes draft/unposted receipts.
- This release does not display total payments, advances, due, returns, moisture/quality deductions, broker commission, transport, or net payable. Those values must come from posted payment, return, and accounting source transactions; showing calculated balances before those source flows exist would be misleading.

## API and permissions

- `GET/POST /api/v1/partners`, `GET/PATCH /api/v1/partners/:id` manage identity fields and require the corresponding partner read/create/update permission.
- `GET /api/v1/partners/:id/financial` requires `partners:VIEW_FINANCIAL`.
- `PUT /api/v1/partners/:id/financial` requires both `partners:UPDATE` and `partners:VIEW_FINANCIAL`.
- `GET /api/v1/partners/:id/ledger` requires `partners:VIEW_FINANCIAL` and returns paginated posted-receipt detail plus company-scoped gross purchase totals.
- Every read and write is scoped to the supplied company. Create/update operations are audited; financial fields are redacted from ordinary partner reads.

## UI and verification

The bilingual Supplier & Farmer Master provides company-scoped search, type and status filters, paginated lists, profile create/edit, a separately protected financial-details dialog, and a protected posted-purchase ledger. The ledger labels its gross-only scope and does not present missing payment/deduction balances as if they were available.
