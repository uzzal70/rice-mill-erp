# Performance & Caching

## Status
Complete

## 1. Business workflow
- **Purpose and actors**:
  - Industrial rice mills operate high-volume, concurrent operations where weighbridges, laboratory testing stations, bagging machines, and sales desks submit hundreds of transactions simultaneously during harvest peaks.
  - In strict compliance with Promptdoc #68 (*"Use: Pagination, Server-side filtering, Indexes, Caching, Lazy loading, Background jobs, Redis where necessary. Never load thousands of records unnecessarily"*), the system enforces strict query bounds, sub-50ms caching, latency interceptors, and background job queues.
- **Preconditions and source documents**:
  - PostgreSQL indexed lookups on all tenant and status columns.
  - Queries must include pagination limits (`limit: 25`, capped at `100`).
- **States and transitions**:
  - Heavy tasks (Bulk imports, PDF statement generations, daily stock reconciliation) execute as asynchronous jobs transitioning: `QUEUED` $\to$ `PROCESSING` $\to$ `COMPLETED` $\to$ `FAILED`.
- **Approval, posting, cancellation, correction/reversal**:
  - Invalidation hooks immediately clear stale cache keys on master updates (`tax:`, `item:`, `config:`).
- **Company/factory/location and ownership scope**:
  - Cache entries are namespaced by `companyId` and `factoryId` to prevent cross-tenant data pollution.

## 2. Database entities
The performance architecture protects high-throughput transaction tables:
- `StockMovement`: B-Tree indexes on `[companyId, factoryId, itemId, occurredAt]` and `[sourceType, sourceId]`.
- `SalesOrder` & `PurchaseOrder`: B-Tree indexes on `[companyId, factoryId, status, createdAt]`.
- `JournalLine`: Compound index on `[journalId, accountId]`.
- `AuditEvent`: Indexed by `[companyId, occurredAt]`.

## 3. Relationships
- `PerformanceInterceptor` monitors all NestJS HTTP requests and sets `X-Response-Time` header.
- `PerformanceService` acts as an in-memory / Redis-ready LRU cache and background worker queue.

## 4. Calculations
1. **Pagination Offset & Limit**:
   $$\text{skip} = (\text{page} - 1) \times \text{limit}, \quad \text{take} = \min(100, \max(1, \text{limit}))$$
2. **Cache Hit Ratio**:
   $$\text{Hit Rate \%} = \frac{\text{Hits}}{\text{Hits} + \text{Misses}} \times 100$$
3. **Slow Query Threshold**:
   $$\text{Latency} > 200\text{ms} \implies \text{WARNING Log Generated}$$

## 5. Accounting impact
- General Ledger reporting relies on pre-computed monthly balances and pagination rather than dynamic full-table scans.

## 6. Inventory impact
- Current stock positions are cached at the Stack level and invalidated atomically upon stock movement writes.

## 7. API
- `GET /performance/stats`: Returns active cache entries count, hit/miss metrics, and hit rate %.
- `POST /performance/cache/invalidate`: Invalidates cache keys by prefix.
- `GET /performance/jobs/:id`: Polls status of background worker tasks.

## 8. Permissions
- Cache invalidation and diagnostic performance stats restricted to `ADMIN` and `MANAGING_DIRECTOR`.

## 9. Validation
- `PaginationQueryDto` enforces integer bounds: `@Min(1)` and `@Max(100)`.
- Requests exceeding 100 records per page are automatically capped to 100.

## 10. UI
- Material UI DataGrid and Table components implement virtualized scrolling, server-side pagination, and lazy query loading.

## 11. Reports
- Heavy reports stream responses or process via background queue to maintain UI responsiveness.

## 12. Tests
- `backend/src/modules/performance/performance.service.spec.ts`: Unit tests verifying pagination capping (limit 5000 capped to 100), TTL expiry, prefix invalidation, and background queue.
- `backend/src/modules/performance/performance.interceptor.spec.ts`: Unit tests verifying `X-Response-Time` header attachment.

## 13. Known limitations & Next steps
- Redis cluster clustering configuration can be added for multi-node Kubernetes container deployments.

