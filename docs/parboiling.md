# Parboiling

## Status
Backend workflow and bilingual UI implemented; resource costing, reversal and handoff into milling remain incomplete.

## 1. Business workflow
- Operators record one batch with ordered soaking, steaming, and drying measurements. Managers approve; authorized users post the resulting paddy stock movement.
- Draft → approved → posted. Posted batches are immutable; corrections require a future reversal flow.
- The batch is scoped to one company/factory, raw paddy item, parboiled paddy item, input stack and output stack.

## 2. Database entities
- `ParboilingBatch` stores input/output/loss, batch timestamps, state and actors.
- `ParboilingStage` stores sequence, stage type, time, weight, moisture, and optional water, temperature, pressure, fuel, electricity, labour and remarks.
- Existing migrations `0008_parboiling_batches` and associated stage schema.

## 3. Relationships
- Both items must be active paddy in KG and all selected stacks belong to the company/factory.

## 4. Calculations
- Loss = batch input − batch output; output must be positive and no greater than input.
- Stage order is soaking → steaming → drying. First input matches batch input; each output matches the next input; final drying output matches batch output.
- Each stage has a valid time within the batch interval and stages cannot overlap.
- No theoretical moisture formula is imposed.

## 5. Accounting impact
- No accounting journal or resource cost allocation is posted. Stage resource measurements are captured only.

## 6. Inventory impact
- Posting atomically issues raw paddy and receives parboiled paddy, with source balance and destination capacity checks.

## 7. API
- `GET/POST /parboiling/batches`; `POST /parboiling/batches/:id/approve`; `POST /parboiling/batches/:id/post`.

## 8. Permissions
- `parboiling:READ/CREATE/APPROVE/POST`, company/factory scoped.

## 9. Validation
- Valid active paddy items/locations, positive weights, reconciled stages/times, final output match, and source stock/destination capacity.

## 10. UI
- Bilingual page captures batch and all three stages, including weights, moisture and optional operating conditions, with approval/post actions.

## 11. Reports
- Paginated batch register includes stage details and status. Export/print and resource cost roll-up remain.

## 12. Tests
- Existing parboiling service tests cover stage order/handoffs, resource capture, atomic posting and insufficient stock.

## 13. Implementation and verification
- Added bilingual page; backend service/API were already implemented.
- Frontend typecheck passes; automated tests were not run during this task.
- Remaining: resource valuation, fuel/electricity/labour costing, reversal, a connected milling handoff, report export, migration application.
