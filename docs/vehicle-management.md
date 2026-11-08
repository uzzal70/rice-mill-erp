# Vehicle Management

## Workflow

Register a company vehicle once, maintain its registration, type, owner, driver/mobile, and compliance expiry dates, then associate it with gate entries. Gate entries retain a vehicle-number snapshot; registered-vehicle links and unregistered visits using the current plate are both available in movement history. Vehicle records can be updated and deactivated without deleting operational history.

## Data and validation

- Vehicles are company-scoped; vehicle numbers are normalized to uppercase and unique within a company.
- Vehicle number and type require at least two non-space characters.
- Optional registration, owner, driver, mobile, and expiry details can be cleared explicitly.
- Fitness, insurance, and tax-token dates are stored as dates and shown as valid, due within 30 days, expired, or not set.
- `GateEntry` movement history is read-only and company/factory-scoped. It includes inward/outward direction, purpose, gate number, status, timestamp, and factory.
- Gate entries linked to the vehicle ID remain associated after vehicle-number edits. Unregistered gate entries with the current plate are also included.

## API and permissions

All routes require an authenticated bearer token and `gate` permissions:

- `GET /api/v1/vehicles?companyId=…&factoryId=…` — `gate:READ`
- `POST /api/v1/vehicles` — `gate:CREATE`
- `PATCH /api/v1/vehicles/:id` — `gate:UPDATE`
- `GET /api/v1/vehicles/:id/movements?companyId=…&factoryId=…` — `gate:READ`

Vehicle lists and movement history use server-side pagination. The management screen currently loads up to 100 vehicles and displays the vehicle register, status, expiry warnings, and movement history.

## Audit and integrity

Vehicle creation and changes are audited; updates are company-scoped and unique-number conflicts are reported explicitly. No vehicle deletion endpoint is provided. Migration `0017_vehicle_movement_index` indexes the company/vehicle/time history lookup.

## Validation

Focused gate/vehicle service tests cover updates, explicit optional-field clearing, audit events, movement scoping, linked vehicle records, and same-plate unregistered visits. Full validation runs include the NestJS build, Prisma schema validation, frontend typecheck, and production build. Migration application requires a configured PostgreSQL database.
