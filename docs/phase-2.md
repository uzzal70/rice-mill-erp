# Phase 2: partner and product masters

## Business workflow

Create company-scoped party records for suppliers, farmers, brokers, and customers before procurement or sales documents can reference them. A broker may carry a configurable commission basis and rate; a customer may carry credit terms; supplier and farmer records may retain bank and identity details. The Supplier & Farmer Master screen manages profiles, protected financial defaults, and a ledger of posted goods receipts with gross purchase value; see [supplier-farmer-master.md](./supplier-farmer-master.md). Payment, advance, payable, return, deduction, commission, and transport totals must come from posted transactions in their relevant later workflows rather than being manually edited here.

Create company-scoped product records before gate, procurement, inventory, or production workflows. Paddy items carry variety and standard moisture/recovery policy inputs. Rice items carry brand/type/grade and composition targets. By-products carry reference purchase/sales prices. Packaging is represented as a separate item with a custom size/material specification and optional supplier; bag sizes are not enumerated in code.

Public rice-mill ERP descriptions commonly connect procurement, party ledgers, by-product inventory, milling conversion, and bag inventory. The implementation uses those workflow concepts while keeping an original schema and API: [RiceERP modules](https://www.riceerp.pk/modules), [Smart Software rice mill management](https://www.smartsoftware.com.bd/rice-mill-management-software), [JaMi-iT rice mill](https://jamiit.com/rice-mill.php).

## Data and relationships

- `Partner` belongs to one company and has one primary type: `SUPPLIER`, `FARMER`, `BROKER`, or `CUSTOMER`. Company plus partner code is unique. A partner can later be referenced by purchases, sales, payments, or packaging supply.
- `Item` belongs to one company and has a kind: `PADDY`, `RICE`, `BY_PRODUCT`, `PACKAGING`, or `OTHER`. Company plus item code is unique.
- Paddy-specific fields: variety, local name, crop year, grade, standard moisture, and standard recovery.
- Rice-specific fields: brand, rice type, variety, grade, head-rice and broken-rice target percentages, and optional default packaging label.
- Reference prices are optional and are never used as posted transaction prices.
- `PackagingSpec` belongs to a packaging item and stores arbitrary positive bag size in kg, bag type, material, unit cost, and an optional supplier.
- Company unit conversions store a directed factor and effective date. The seed supplies the Bangladesh default `1 MON = 40 KG`; companies can add or change effective-dated conversions.

## Calculation and accounting/inventory effects

Master-data creation performs no stock movement, payable/receivable posting, commission accrual, or accounting journal. Opening balances are retained as setup data and will be posted through the later opening-balance workflow. Reference prices do not drive a transaction. Moisture/recovery percentages are policy inputs only; procurement and production services will preserve actual inputs and formula versions when implemented. Unit conversion uses the company’s effective-dated factor, never a UI-side hard-coded conversion.

## API, permissions, and validation

- `GET/POST /api/v1/partners`, `GET/PATCH /api/v1/partners/:id`; financial details are isolated at `GET/PUT /api/v1/partners/:id/financial`.
- `GET/POST /api/v1/items`, `GET/PATCH /api/v1/items/:id`; packaging specs use `PUT /items/:id/packaging`, while price reads/changes use `GET/PUT /items/:id/reference-prices`.
- `GET/POST /api/v1/unit-conversions`; `POST /unit-conversions/convert` performs decimal-safe conversion through effective-dated company rules.
- Every request supplies `companyId`; the access guard verifies membership and the resource permission for that same company.
- Lists require server pagination and support type/kind, active status, and search filters.
- Codes are normalized to uppercase and unique within a company. Partner type and item kind are fixed at creation. Decimal fields reject negative or out-of-range values. Paddy moisture/recovery and rice composition percentages stay within 0–100; head-rice plus broken-rice targets cannot exceed 100%. Broker percentage commission cannot exceed 100%. Package size and conversion factors must be positive.
- Every create/update writes an audit event. Financial partner details and item reference prices require both UPDATE and VIEW_FINANCIAL permissions; ordinary list/detail responses redact bank, opening-balance, commission-rate, and reference-price values. Updating a master never mutates past transaction snapshots.

## UI and reports

The bilingual Paddy Master register is implemented with searchable, paginated active/inactive filters, create/edit forms, and required quality baselines; see [paddy-master.md](./paddy-master.md). The Rice Product Master supports configurable product types, composition targets, and packaging labels; see [rice-product-master.md](./rice-product-master.md). The By-product Master provides typed products, protected purchase/sales reference prices, and ledger-derived stock/production/sales activity; see [by-product-master.md](./by-product-master.md). The Packaging Master accepts arbitrary positive sizes, supplier/material details, financial-protected unit costs, and factory ledger stock; see [packaging-master.md](./packaging-master.md). Master prices remain defaults, while actual stock and sales come from posted transactions.

## Tests

Unit tests cover paddy and rice profile validation, partner commission limits, financial-field redaction, and decimal-safe unit conversion. The access guard tests cover tenant isolation and the combined financial permissions. Database-backed integration tests require PostgreSQL and will be run when a local database is configured.
