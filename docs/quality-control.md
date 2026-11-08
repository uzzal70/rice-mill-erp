# Quality Control

## Workflow

1. Create a gate, pit, or final sample against a gate entry in `QUALITY`.
2. Record one set of laboratory measurements and comments.
3. An authorized approver explicitly accepts or rejects the tested sample.
4. Acceptance moves the gate entry to `RECEIVING` only after all samples for that gate have a decision. A rejection moves the gate entry to `REJECTED` immediately. Approved results are locked and audited.

The bilingual laboratory desk shows sample stage, gate, vehicle, supplier/customer, material, recorded measurements, and available actions. The gate desk continues to support the same workflow.

## Measurements and validation

Incoming paddy measurements are stored as percentage values from 0 to 100, with up to two decimal places:

- Moisture
- Foreign matter
- Broken
- Damaged
- Discolored
- Immature
- Chalky
- Purity
- Other

At least one measurement is required before a sample can be tested. Numeric zero is a valid result. Sample number is unique per company. Results can only be submitted once while the sample is `SAMPLE`; decisions can only be recorded for `TESTED` samples while the gate is awaiting quality.

## API and permissions

- `POST /api/v1/gate/entries/:id/quality-samples` — `quality:CREATE`
- `GET /api/v1/quality/samples?companyId=…&factoryId=…` — `quality:READ`
- `POST /api/v1/quality/samples/:id/results` — `quality:UPDATE`
- `POST /api/v1/quality/samples/:id/approve` — `quality:APPROVE`

Every read and write is scoped to the company and factory; approval and result submissions are transactional and audited. Gate-row locking serializes decisions across multiple samples. Approved/rejected results are immutable through the current APIs.

## Commercial boundary

The lab records evidence and an explicit authorized acceptance/rejection. Quality approval itself does not change purchase rate or quantity. At purchase creation, an accepted moisture measurement may be processed by the configured policy engine in [moisture-calculation.md](./moisture-calculation.md); no other quality penalty or deduction is inferred.

## Validation

Service and DTO tests cover all parameter fields, percentage bounds, zero values, one-time result submission, audit records, authorized gate transitions, and result locking. The results are factory-scoped and queried through the quality sample register.
