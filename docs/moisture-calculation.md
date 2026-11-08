# Moisture Calculation Engine

## Business workflow

1. The laboratory records and approves a quality sample. Its moisture reading is the commercial source measurement.
2. Procurement selects an accepted moisture-bearing sample when a gate has multiple approved moisture samples. A single approved moisture-bearing sample is selected automatically. A selected sample must belong to that gate and be accepted.
3. The engine finds active policies for the company matching the factory, paddy variety, and supplier/farmer. Null scope values are wildcards.
4. The matching policy with the greatest numeric priority wins. If multiple matches share that highest priority, purchase creation fails explicitly; no arbitrary policy is selected.
5. Purchase creation snapshots the sample, selected policy identity/name, formula, moisture inputs, thresholds, quantity deduction, rate deduction, physical and payable quantities, agreed and adjusted rates.
6. GRNs and stock movements continue to use physical KG. Supplier purchase value uses the moisture-adjusted payable quantity and rate.

## Policy configuration

`MoisturePolicy` is company-scoped, optionally scoped to a factory, paddy item, and supplier/farmer, and includes:

- Active/inactive status and administrator-managed integer priority.
- Allowed moisture percentage and non-negative tolerance.
- Either `DRY_MATTER_CORRECTION` or `SLAB_PERCENTAGE`.
- An independent rate deduction percentage, applied only when measured moisture exceeds allowed moisture plus tolerance.
- Ordered slab thresholds and quantity deductions for the slab formula. The first threshold must be zero; each next threshold must be strictly higher.

Policies can be listed, created, and updated at `/api/v1/moisture-policies`. Reads require `moisture-policies:READ` and `VIEW_FINANCIAL`; create/update require `CREATE` or `UPDATE` plus `VIEW_FINANCIAL`. Every change is audited. Policy configuration supports disablement rather than deletion so references remain traceable.

## Calculations

Let:

- `P` = physically weighed quantity in KG.
- `M` = approved sample moisture percentage.
- `A` = allowed moisture percentage.
- `T` = configured tolerance percentage.
- `L = A + T` = accepted moisture limit.
- `E = max(M - L, 0)` = moisture excess.

If `E` is zero, payable quantity remains `P`, and the agreed rate is retained.

For dry-matter correction:

`payableQuantity = P × (100 - M) / (100 - L)`

For slab percentage deduction, the engine selects the slab with the greatest `minExcessPct` less than or equal to `E`:

`payableQuantity = P × (100 - slabDeductionPct) / 100`

The independent rate adjustment applies only when `E > 0`:

`adjustedRate = agreedRate × (100 - rateDeductionPct) / 100`

Payable KG is rounded to three decimal places and adjusted rate to four, both using decimal half-up rounding. Deduction KG is physical KG minus rounded payable KG. A policy or deduction that would make payable quantity or rate zero is rejected.

## Physical inventory and supplier value

- Purchase-order `orderedQuantity` remains the physical weighbridge quantity and is the cap for received GRNs.
- `payableQuantityKg` is a distinct, immutable-at-creation commercial snapshot. It never replaces physical GRN or inventory quantity.
- The effective inventory cost per physical KG is `payableQuantityKg × adjustedUnitRate / orderedQuantity`; each posted stock receipt uses that normalized cost.
- Posted supplier ledger value allocates the order payable amount proportionally over physical receipt quantities. This keeps partial GRNs aligned with the purchase snapshot.
- Broker commission remains on the existing physical weighbridge KG and original agreed-rate basis. This phase does not change commission terms.
- The module calculates purchase values and stock cost basis, but does not create supplier settlements or accounting journals. Supplier payments, advances, returns, additional deductions, commissions payable, transport, and full payable balances remain unimplemented; see [completed-tasks.md](./completed-tasks.md) for the #17 boundary.

## No measurement and no-policy behavior

- If no accepted sample has a moisture measurement, purchase creation retains the existing no-deduction behavior and does not require a moisture policy.
- If an accepted moisture measurement exists, an active matching policy is mandatory even when the reading falls within the accepted limit. Missing policy, ambiguous sample selection, or tied top priority is an explicit error.
- Zero is a valid measured moisture value.

The schema/backfill migration is `0018_moisture_policies`. Existing purchase orders are initialized with payable quantity equal to physical quantity and adjusted rate equal to agreed rate. Apply the migration through the normal deployment process; it has not been applied in an environment without a configured PostgreSQL database.

## Verification

Tests cover both formulas, tolerance, separate rate deductions, decimal rounding, invalid limits, slab selection, policy validation/audit, missing policies, priority conflicts, purchase snapshots, unchanged physical quantities, and moisture-adjusted supplier ledger allocation.
