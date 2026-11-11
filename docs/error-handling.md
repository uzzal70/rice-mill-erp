# Error Handling Architecture Specification (#72)

## 1. Executive Summary & Architectural Overview
In an industrial ERP environment managing hundreds of metric tons of grain, multi-million BDT purchase contracts, and complex double-entry financial journals, cryptic errors such as `"500 Internal Server Error"` or raw SQL exceptions cause catastrophic operational confusion and data loss. 

The **Rice Mill ERP Platform** enforces the strict standard defined in `docs/promtdoc.md` (#72): **All errors must be human-readable, context-aware, and actionable**. 

Whenever an operation cannot be completed, the system reports exact quantities, entity names, missing permissions, or specific domain rules that prevented completion, while completely shielding internal PostgreSQL stack traces and schema details.

---

## 2. Comparison: Bad vs. Good Error Handling

| Scenario | ❌ BAD (Generic / Technical) | ✅ GOOD (Human-Readable & Actionable) |
| :--- | :--- | :--- |
| **Stock Shortage** | `500 Internal Server Error` | `"Insufficient stock for Miniket Paddy. Available: 1,250 KG. Requested: 1,500 KG. Shortfall: 250 KG."` |
| **Duplicate Code** | `Unique constraint failed on the fields: (code)` | `"A variety or item with code 'MINIKIT-28' already exists in this company."` |
| **Missing Foreign Key** | `P2003 Foreign key constraint failed` | `"The selected godown 'Godown B' does not belong to Bogura Factory."` |
| **Weighbridge Tare** | `Invalid measurement` | `"Tare weight (14,200 KG) cannot exceed Gross weight (12,800 KG)."` |
| **Quality Moisture** | `Validation failed on moistureReceivedPct` | `"Moisture content 38.5% exceeds maximum acceptable threshold of 35.0%."` |
| **Unbalanced Journal** | `DB transaction rollback` | `"Unbalanced journal entry. Total Debits (৳45,000) must equal Total Credits (৳43,500)."` |
| **Posted Deletion** | `Cannot delete record` | `"Posted Goods Receipt GRN-2026-004 cannot be deleted because inventory movements are committed."` |

---

## 3. Global Exception Filter Pipeline
All exceptions originating from controllers, domain services, or the Prisma ORM are captured by `GlobalExceptionFilter` registered globally in `backend/src/main.ts`:

```mermaid
flowchart TD
    A[Exception Thrown in Service / Guard / Pipe] --> B[GlobalExceptionFilter]
    B --> C{Exception Type}
    C -->|HttpException| D[Extract Human Message & Validation Errors]
    C -->|Prisma Known Error| E[Translate DB Code to Plain Language]
    C -->|Unhandled System Error| F[Log Full Trace to File; Return Safe Operational Error]
    D --> G[Assemble Standard Error JSON]
    E --> G
    F --> G
    G --> H[Send HTTP Status & Human-Readable JSON to Client]
```

---

## 4. Implementation Details: `GlobalExceptionFilter`
Located in `backend/src/common/http-exception.filter.ts`:
- **Prisma Error Translation**:
  - `P2002` (Unique Constraint): Automatically extracts the target field name and informs the user that a duplicate record exists.
  - `P2003` (Foreign Key): Explains that a referenced partner, warehouse, or item does not exist.
  - `P2025` (Record Not Found): Informs the user that the requested record has either been removed or does not exist.
- **DTO Validation Errors**: Unpacks `class-validator` message arrays into distinct, localized error bullet points.
- **Domain Business Exceptions**: Preserves rich business error messages (e.g. moisture deductions, credit limits, stack capacity overflows).

---

## 5. Domain-Specific Human-Readable Errors

### 5.1 Inventory & Warehouse Domain
```typescript
if (availableQty < requestedQty) {
  throw new BadRequestException(
    `Insufficient stock for item "${item.name}". Available: ${formatNumber(availableQty)} ${item.baseUnit}. Requested: ${formatNumber(requestedQty)} ${item.baseUnit}.`
  );
}
```

### 5.2 Quality & Moisture Domain
```typescript
if (moisturePct > 35.0) {
  throw new BadRequestException(
    `Paddy moisture content (${moisturePct}%) is excessively wet and exceeds laboratory testing limits (maximum 35.0%).`
  );
}
```

### 5.3 Accounting & Financial Domain
```typescript
if (!totalDebit.equals(totalCredit)) {
  throw new BadRequestException(
    `Unbalanced journal voucher. Total debits (৳${totalDebit.toFixed(2)}) must equal total credits (৳${totalCredit.toFixed(2)}). Difference: ৳${totalDebit.minus(totalCredit).abs().toFixed(2)}.`
  );
}
```

---

## 6. Frontend Toast & Alert Integration
When an API call fails, `frontend/src/lib/api.ts` parses the `message` string and triggers Material UI alert banners and snackbar notifications:
- Toast notifications display the clean human-readable error.
- Complex multi-field validation errors are mapped to specific input form fields using helper text and red borders.
- Destructive actions (such as attempting to post an invalid transaction) present clear modal explanations of why the operation was rejected.

---

## 7. Security & Information Disclosure Prevention
To prevent information leakage:
1. Database passwords, connection strings, hostnames, and IP addresses are completely masked.
2. SQL syntax errors or query fragments are suppressed from the client response.
3. Internal server errors are logged server-side with correlation IDs so system administrators can inspect the full stack trace securely.

---

## 8. Bilingual Error Localization (Bengali & English)
Error messages integrate with the i18n translation engine:
- English: `"Insufficient stock. Available: 1,250 KG. Requested: 1,500 KG."`
- Bengali: `"পর্যাপ্ত মজুদ নেই। বর্তমান মজুদ: ১,২৫০ কেজি। অনুরোধকৃত: ১,৫০০ কেজি।"`

---

## 9. HTTP Status Code Mapping Standards

| HTTP Status | Meaning | Typical Usage in Rice Mill ERP |
| :--- | :--- | :--- |
| **400 Bad Request** | Domain Rule Violation | Insufficient stock, unbalanced journal, invalid moisture |
| **401 Unauthorized** | Missing / Expired Auth | Expired session token, missing login credentials |
| **403 Forbidden** | RBAC / Tenant Boundary | User attempting to access another company or unauthorized factory |
| **404 Not Found** | Record Missing | Gate entry, purchase order, or customer ID does not exist |
| **409 Conflict** | Concurrency / Duplicate | Duplicate invoice number, transaction locking collision |
| **422 Unprocessable** | Semantic Validation | Malformed DTO, negative weight, invalid crop year |
| **500 Internal Error** | System Failure | Database network timeout, disk full (sanitized for client) |

---

## 10. Audit Logging of System Failures
Critical domain failures (such as unauthorized deletion attempts, duplicate invoice submissions, or price tampering) automatically trigger an audit entry:
- `eventType`: `SECURITY_EXCEPTION` / `INTEGRITY_VIOLATION`
- `userId`: Identity of requesting user
- `metadata`: Endpoint, submitted payload, and rejection reason

---

## 11. Backend Unit Test Suite
Verified in `backend/src/common/http-exception.filter.spec.ts`:
- Correct formatting of human-readable `BadRequestException`.
- Unwrapping of `ValidationPipe` error arrays.
- Shielding of Prisma `P2002` duplicate errors.
- Shielding of Prisma `P2003` foreign key violations.
- Safe masking of unexpected 500 runtime errors.

---

## 12. Developer Runbook: Authoring Domain Exceptions
Engineers writing backend modules must adhere to the rule:
1. **Never throw bare Error**: Always use specific NestJS `HttpException` subclasses (`BadRequestException`, `NotFoundException`, `ForbiddenException`).
2. **Include Exact Numbers**: Always include `{ Available, Requested, Shortfall }` in inventory errors.
3. **Avoid Technical Jargon**: Use terms like "Paddy Variety" instead of `Item.kind = PADDY`, and "Godown" instead of `godownId`.

---

## 13. Promtdoc #72 Compliance Matrix & Verification Checklist

| Requirement | Promtdoc #72 Specification | Implementation Status | Evidence / Verification |
| :--- | :--- | :--- | :--- |
| **Human-Readable Errors** | Plain-language descriptions instead of technical codes | **COMPLETE** | Implemented across all domain services |
| **Exact Quantities in Messages** | Available vs. Requested amounts in stock errors | **COMPLETE** | Verified in `integrity.service.ts` & `inventory.service.ts` |
| **Prisma Error Shielding** | Mask P2002, P2003, P2025 raw engine traces | **COMPLETE** | `GlobalExceptionFilter` translation layer |
| **Validation Array Parsing** | Clean extraction of DTO validation failures | **COMPLETE** | Verified in `http-exception.filter.spec.ts` |
| **No 500 Stack Leakage** | Raw stack traces never sent to clients | **COMPLETE** | Masked in `GlobalExceptionFilter` |
| **Automated Test Coverage** | Unit test suite for error mapping | **COMPLETE** | `http-exception.filter.spec.ts` (100% passed) |

