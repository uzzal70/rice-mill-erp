# Phase 3: vehicle, gate, weighbridge, and quality

## Business workflow

1. Register a company vehicle or record its number at the gate for a one-off visit.
2. Create an inward or outward gate entry for a company factory. The request snapshots the vehicle number, driver, partner, item, challan, and reference information.
3. Record one immutable manual weighbridge ticket for the entry. The API computes net weight with decimal arithmetic and advances the entry through `WEIGHING` to `QUALITY`.
4. Create gate, pit, or final laboratory samples and record measured parameters. Test results are submitted once; approval locks that sample.
5. An accepted sample advances the entry to `RECEIVING`; a rejected sample moves it to `REJECTED`. An accepted entry can be marked `COMPLETED`.

All status changes and ticket/sample creation are transactional and audited. State-conditional updates prevent duplicate weigh tickets, result submission, decisions, or completion. Multiple quality samples can be tested independently: the gate remains in `QUALITY` until every sample is decided, while any rejection rejects the gate immediately. Gate entries, tickets, and samples cannot be deleted through these APIs.

## Data and integrity

- `Vehicle` is company-scoped; vehicle numbers are normalized to uppercase and unique per company. Expiry dates for fitness, insurance, and tax token are retained.
- `GateEntry` is company/factory-scoped. Compound foreign keys ensure its factory, optional vehicle, partner, and item belong to the same company. Company plus gate number is unique.
- `GateAttachment` keeps audit metadata in PostgreSQL and file bytes in the configured `GATE_ATTACHMENT_DIR`. Keys are generated server-side; uploaded files are limited to 10 MB and verified as PDF, JPEG, PNG, or WebP by content signature. Deployments must mount and back up this directory as persistent storage.
- `WeighbridgeTicket` is unique per gate entry and per company ticket number. It retains both weights, their timestamps, computed net weight, operator, and a server-set `isManual = true`. Database checks enforce positive net weight, gross greater than tare, arithmetic consistency, and timestamp order. The current API is deliberately manual-only; callers cannot label a client-supplied reading as device captured.
- `QualitySample` is scoped to the same company/factory/gate entry. It stores typed sample stage, moisture, foreign matter, broken, damaged, discolored, immature, chalky, purity, and other percentages, tester, approver, decision, comments, and lock timestamps. Parameters are percentages from 0 through 100; no deduction policy or purchase-price adjustment is inferred in this phase.

## API and permissions

All routes are under `/api/v1` and require a bearer access token plus company/factory permissions:

- `GET /vehicles` (factory users supply `factoryId` for scope), `POST /vehicles` — `gate:READ/CREATE`
- `GET/POST /gate/entries`, `GET /gate/entries/:id` — `gate:READ/CREATE`
- `POST /gate/entries/:id/attachments?companyId=…&factoryId=…` — `gate:CREATE`, multipart field `file`
- `GET /gate/entries/:id/attachments/:attachmentId?companyId=…&factoryId=…` — `gate:READ`
- `POST /gate/entries/:id/weighbridge` — `weighbridge:CREATE`
- `POST /gate/entries/:id/quality-samples` — `quality:CREATE`
- `POST /quality/samples/:id/results` — `quality:UPDATE`
- `GET /quality/samples` — `quality:READ`
- `POST /quality/samples/:id/approve` — `quality:APPROVE`
- `POST /gate/entries/:id/complete` — `gate:UPDATE`

List routes use server pagination and optional search/status/factory filters. The global validation pipe rejects unknown fields. Weighbridge ticket edits and quality result edits are intentionally unavailable after creation/submission; corrections require a future explicit correction workflow.

## Calculation

`netWeight = grossWeight - tareWeight` uses Prisma Decimal, not JavaScript floating point. Gross and tare must be nonnegative and gross must exceed tare. First weight time must not be later than second weight time. Unit normalization and configurable moisture deductions are not applied here; those belong to later procurement and calculation-engine phases.

## Accounting and inventory

Gate, weighbridge, and quality records are operational evidence only. They do not create stock movements, supplier balances, purchase documents, or journal entries. Those effects occur only with the later procurement/GRN posting workflow. Completing a gate entry must not be interpreted as goods received into inventory.

## Current boundaries

Digital weighbridge integration, configurable quality acceptance thresholds, and gate exit verification are not implemented. Any future digital adapter must establish device identity and authenticated readings, idempotency/replay behavior, calibration/health handling, and an auditable immutable capture before it can create a non-manual ticket; no hardware protocol is assumed here. Lab results remain explicit evidence for acceptance/rejection; the approved moisture measurement also feeds the separate configurable purchase policy in [moisture-calculation.md](./moisture-calculation.md). The gate desk supports inward/outward entries, key transaction references, document/photo upload, and authenticated download. Tickets are always explicitly marked manual to avoid representing a future integration as live functionality.

## Tests

Unit tests cover decimal-safe net weight, invalid weights, timestamp ordering, conditional gate-stage changes, attachment content validation, company/factory scoping, disk persistence, and audit writes. Database-backed migration/integration checks require a configured PostgreSQL database.
