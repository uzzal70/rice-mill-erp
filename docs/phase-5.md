# Phase 5: production batch and recovery (partial)

## Implemented milling-batch workflow

1. Create a draft batch scoped to one company and factory, selecting an active paddy item and input stack.
2. Record actual production start/end time, input quantity, and one or more rice/by-product outputs with destination stacks.
3. The server calculates total output, process loss, head-rice recovery, total-rice recovery, and by-product recovery from the recorded quantities. It snapshots the paddy item's configured standard recovery for comparison.
4. Approve the draft batch.
5. Post the approved batch. One database transaction verifies the paddy balance and destination stack capacities, issues the paddy, receives each output, marks the batch posted, and writes an audit event.

Loss is calculated as `input KG - sum(output KG)`; batches whose output exceeds input are rejected. Head and broken rice are classified by the rice item's `riceType` (`BROKEN` is broken rice; other rice types count as head rice). Non-rice outputs count as by-products for recovery. Recovery percentages are based on actual input, not a hard-coded yield.

Posted stock balances remain derived from the stock-movement ledger. Production input is a negative `PRODUCTION_IN` movement and each finished/by-product output is a positive `PRODUCTION_OUT` movement, all linked to the source batch/output and recorded at the batch completion time. Posting uses serializable isolation and rejects insufficient paddy or stack capacity. Posted batches are not editable through these routes.

## Routes and permissions

- `GET /production/batches` — `production:READ`
- `POST /production/batches` — `production:CREATE`
- `POST /production/batches/:id/approve` — `production:APPROVE`
- `POST /production/batches/:id/post` — `production:POST`
- `GET /drying/batches` — `drying:READ`
- `POST /drying/batches` — `drying:CREATE`
- `POST /drying/batches/:id/approve` — `drying:APPROVE`
- `POST /drying/batches/:id/post` — `drying:POST`
- `GET /parboiling/batches` — `parboiling:READ`
- `POST /parboiling/batches` — `parboiling:CREATE`
- `POST /parboiling/batches/:id/approve` — `parboiling:APPROVE`
- `POST /parboiling/batches/:id/post` — `parboiling:POST`

Batch lists are company/factory-scoped and paginated. Errors identify the insufficient paddy quantity or destination capacity. Drying batches record actual moisture before/after, input/output kg, method, duration, optional fuel/electricity/labour use, and measured loss; no assumed moisture-yield formula is applied. Drying stock posting moves the same paddy item from source to destination stack and records the actual weight loss.

Parboiling batches require three measured stages in order: soaking, steaming, and drying. Each stage stores time range, input/output weight, moisture before/after, and optional water, temperature, pressure, fuel, electricity, labour cost, and remarks. Stage weight handoffs must reconcile, and final drying output must match the batch output. The batch consumes raw paddy and receives the selected parboiled-paddy item; posting is atomic and checks stock/capacity.

## Current boundary

This is a partial Phase 5 implementation. Production lines and machine assignment, cost allocation, by-product sales valuation, repacking migration deployment, and reversal/correction workflows remain incomplete. Production, drying, parboiling, and repacking stock posting do not yet create accounting journals or value output inventory costs.

## Validation

`production.calculations.spec.ts` verifies the 4,000 KG recovery example and invalid mass balances. `production.service.spec.ts` verifies stock posting, below-standard recovery indication, insufficient paddy rejection, and stack-capacity rejection. `drying.service.spec.ts` verifies actual drying measurements/loss, moisture ordering, movement posting, insufficient stock, and same-stack capacity accounting. `parboiling.service.spec.ts` verifies stage order and weight reconciliation, measured resource capture, atomic posting, and insufficient stock handling. The full migration chain and drying/parboiling stock flows were run against disposable PostgreSQL.
