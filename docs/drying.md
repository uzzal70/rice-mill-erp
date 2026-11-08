# Drying

## Status
Backend workflow and bilingual UI implemented; resource costing and reversal remain incomplete.

## 1. Business workflow
- A production operator records actual drying for paddy. A manager approves the draft, and a user with post permission records the stock movement.
- Draft → approved → posted. Posted batches are immutable. Corrections require a future reversal workflow.
- A batch has one company/factory, paddy item, source stack, destination stack, and actual time range.

## 2. Database entities
- `DryingBatch` snapshots batch number, input/output/loss KG, moisture before/after, method, duration, fuel quantity, electricity use, labour cost, remarks, workflow state, and actors/timestamps.
- Existing migration `0007_drying_batches`.

## 3. Relationships
- Paddy item and source/destination stacks must belong to the selected company/factory. The two stack locations may be the same.

## 4. Calculations
- Drying loss = input KG − output KG; output must be positive and no greater than input.
- Moisture after cannot exceed moisture before. No theoretical moisture/yield formula is imposed.

## 5. Accounting impact
- No journal or cost allocation is currently posted. Fuel, electricity, and labour values are recorded observations only.

## 6. Inventory impact
- Posting atomically writes negative paddy input and positive paddy output movements. It checks available item balance and destination capacity; stock remains in KG.

## 7. API
- `GET/POST /drying/batches`; `POST /drying/batches/:id/approve`; `POST /drying/batches/:id/post`.

## 8. Permissions
- `drying:READ/CREATE/APPROVE/POST`, company/factory scoped.

## 9. Validation
- Positive input/output, output ≤ input, ordered timestamps, valid moisture percentages, active paddy and active warehouse locations, sufficient stock and capacity.

## 10. UI
- Bilingual drying form captures measured weights, moisture, method, duration, resource observations, and timestamps; list supports approval and posting.

## 11. Reports
- Paginated batch register includes measurements, loss, resources and state. Export/print and cost summaries remain.

## 12. Tests
- Existing drying calculation and service tests cover loss, moisture ordering, stock movements, insufficient stock and capacity.

## 13. Implementation and verification
- Added bilingual drying workflow screen; backend API and atomic stock posting were already present.
- Frontend typecheck passes. Automated tests were not run during this task.
- Remaining: fuel stock issue, resource valuation, cost allocation, reversal, report export and migration application on deployment DB.
