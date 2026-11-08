# Phase 4: purchase receiving and stock custody

## Receiving workflow

1. A gate entry must be an accepted inward `PROCUREMENT` visit with a weighbridge ticket and an approved `ACCEPT` quality sample.
2. Create a draft purchase order referencing that gate entry, supplier/farmer, paddy item, destination godown/stack, and positive KG rate. Ordered quantity is snapshotted from net weighbridge weight.
3. A user with `procurement:APPROVE` approves the order.
4. Create one or more draft GRNs up to the order's remaining quantity; approve each GRN.
5. A user with `procurement:POST` posts the GRN. Posting atomically locks the GRN, writes a positive stock movement at the selected stack, records the unit rate as the initial unit cost, and audits the movement. When total posted quantity equals ordered quantity, the order is posted and the gate entry completes.

All reads and writes are company/factory scoped. Unique document numbers, one purchase order per gate entry, conditional state transitions, and serializable transaction isolation protect against duplicate receipts and concurrent over-receiving.

## Warehouse and inventory

- Godowns and stacks belong to one company/factory. Compound foreign keys prevent using a stack from another tenant/factory or a stack in a different godown than the purchase destination.
- Every stack has a positive KG capacity. Occupancy is derived from the sum of ledger quantities for all items at that stack, so different paddy varieties share the same physical capacity.
- Stack master data supports designated material, variety, crop year, batch, lot, and received date. Occupancy and available capacity are live ledger calculations; age bands use the stack's recorded received date (not FIFO lot-level age). See [godown-stack-management.md](./godown-stack-management.md).
- `PATCH /stacks/:stackId` updates stack code, capacity, and metadata. Capacity cannot be reduced below occupied stock; all changes are audited.
- `GET /inventory/stock` returns item/stack balances from the movement ledger; `GET /inventory/transactions` is a paginated movement register.
- A stock transfer creates one transfer document and two signed movements in the same factory: negative at source, positive at destination. It rejects insufficient source stock and over-capacity destinations.
- An inventory adjustment requires a nonzero signed quantity and a reason; the posted movement is audited and cannot be edited or deleted by the API. Negative adjustments cannot exceed item balance; positive adjustments cannot exceed total stack capacity.

Movement quantity convention: positive is stock-in, negative is stock-out. GRNs use positive `RECEIPT`; transfers use a negative and a positive `TRANSFER`; adjustments preserve their signed quantity. Balances are always the sum of movements, not a mutable stock field.

## Routes and permissions

- `GET/POST /godowns` — `godowns:READ/CREATE`
- `GET/POST /stacks`, `PATCH /stacks/:stackId` — `stacks:READ/CREATE/UPDATE`
- `GET /inventory/stock`, `GET /inventory/transactions` — `inventory:READ`
- `POST /inventory/transfers`, `POST /inventory/adjustments` — `inventory:POST`
- `GET/POST /procurement/purchases`, `POST /procurement/purchases/:id/approve` — `procurement:READ/CREATE/APPROVE`
- `GET/POST /goods-receipts`, `POST /goods-receipts/:id/approve`, `POST /goods-receipts/:id/post` — `procurement:READ/CREATE/APPROVE/POST`

Lists use server-side pagination. Create operations validate tenant/factory references and record audit events.

## Accounting and release boundary

GRN posting changes physical stock only in this phase. It does not yet create a supplier payable, purchase journal, landed-cost allocation, purchase return, or supplier-ledger entry; these require the accounting/payment phase. GRN receipt remains the paddy purchase-receiving workflow. Transfers and adjustments accept all active item kinds in the item's base unit. Stack occupancy is calculated in KG using effective company unit conversions; non-KG items require a configured conversion. Opening stock, generic stock counts/reconciliation, and dedicated transfer/adjustment forms remain outstanding. See [inventory-engine.md](./inventory-engine.md).

The frontend includes the gate/quality, paddy procurement, GRN approval/posting, and stock overview workflows. Use Swagger at `/api/docs` for the full API surface; configure the database and run all migrations before testing against persistent data.
