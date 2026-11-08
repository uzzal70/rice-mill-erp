# Rice mill types and operating modes

## Configuration model

One company can operate multiple factories in the same ERP. Each factory has one primary production type and may have multiple business modes:

| Configuration | Values | Scope |
|---|---|---|
| Production type | `AUTO`, `PARBOILED`, `TRADITIONAL`, `INTEGRATED` | Factory |
| Business mode | `PADDY_TRADING`, `RICE_TRADING`, `WHOLESALE`, `RETAIL`, `DEALER_DISTRIBUTION`, `TOLL_MILLING` | Factory |

Factories can independently have multiple godowns, stacks, and production lines. Shared company master data and tenant-scoped transactions allow factories to coexist without creating separate applications.

The factory API accepts `businessModes` as an optional array when creating a factory. Omitting it stores an empty array, preserving existing clients and migrated factory records. Invalid values and non-array values are rejected by DTO validation.

## Workflow boundary

Production-type and business-mode configuration records how a factory is intended to operate; it does not claim that every corresponding transaction workflow is already implemented. Factory production type, multi-factory company structure, godowns, stacks, and production lines are represented in the current data model. Paddy procurement and production/drying/parboiling workflows are implemented in their respective phases.

Paddy/rice trading, wholesale/retail/dealer sales workflows, and toll/commercial milling are not complete yet. Their operational behavior must be added in the relevant later modules, with company/factory scoping, ownership-aware stock, and corresponding financial posting. In particular, configuring `TOLL_MILLING` does not permit customer-owned paddy to be treated as company stock; the toll-milling workflow must enforce that separation when implemented.

## API

`POST /factories` accepts:

```json
{
  "companyId": "company-id",
  "name": "Bogura Factory",
  "code": "BOGURA",
  "productionType": "AUTO",
  "businessModes": ["PADDY_TRADING", "WHOLESALE"]
}
```

`GET /factories` returns the configured `productionType` and `businessModes` for each factory in the caller's company scope.
