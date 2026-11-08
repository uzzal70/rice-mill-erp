# Module development standard

This standard implements the project’s design-before-code principle. A module is not started as a UI-only task: its business behavior and operational/financial effects must be understood first, and its API and tests must exist before the workflow is considered complete.

## Required sequence

### 1. Specify the business behavior

Create or update the module’s design note using the template below. Record the workflow, actors, states, approval/posting transitions, cancellation or correction behavior, and relevant company/factory boundaries. For accounting and inventory effects, describe the actual effect or explicitly state why the workflow has none.

Complete the business design before implementing the module. Record unresolved policy decisions rather than silently choosing business rules.

### 2. Implement and verify the backend

Implement schema and migration changes, DTO validation, authorization, service-level business rules, API routes, and calculations in backend modules. Business calculations and state transitions belong in backend services, not React components.

Write focused tests for calculations, validation, permissions, tenant boundaries, stock effects, accounting effects, state transitions, and error cases as applicable. A test category marked not applicable in the design note must include a reason.

Stock-changing and financially material operations must be atomic. Posted records must not be silently edited or deleted; corrections use the documented reversal or correction flow.

### 3. Implement the user workflow

Build the UI only against the documented, implemented API. Follow the design note for roles, validation, workflow states, errors, and reports. Do not add a visible action that has no working API behavior.

### 4. Close the module

Update the design note with implementation status, route and permission references, tests run, report status, and known limitations. Run the focused tests and build/type checks covering the change. A module or scope must remain marked partial when required behavior is absent; configuration or a placeholder screen does not count as a working workflow.

## Module design template

Copy this section into the relevant module or phase design note before implementation. Use `Not applicable` with a reason where a category genuinely does not apply.

```markdown
# <Module name>

## Status
Not started | Designed | Backend in progress | Backend verified | UI in progress | Complete

## 1. Business workflow
- Purpose and actors:
- Preconditions and source documents:
- States and transitions:
- Approval, posting, cancellation, correction/reversal:
- Company/factory/location and ownership scope:

## 2. Database entities
- Entity, required fields, status, immutable snapshots:
- Unique/check constraints and indexes:
- Migration:

## 3. Relationships
- Parent/child and tenant/factory relationships:
- Cross-module references:
- Delete and retention behavior:

## 4. Calculations
- Formula, units, precision and rounding:
- Configurable policy and effective date, if applicable:
- Edge cases and rejected inputs:
- Stored input/result/version evidence:

## 5. Accounting impact
- Debit/credit entries or explicit reason there is no financial posting:
- Account mappings, currency, tax, counterparty ledger:
- Reversal/correction behavior:

## 6. Inventory impact
- Item ownership, location, lot/batch, and movement types:
- Stock-in/out/reservation or explicit reason there is no stock effect:
- Negative-stock, capacity, and reversal behavior:

## 7. API
- Method, route, request/response, filters and pagination:
- State-changing endpoints and idempotency:
- Error codes/messages:

## 8. Permissions
- Resource/action matrix by role:
- Company/factory scope:
- Financial data restrictions:

## 9. Validation
- DTO and database constraints:
- Cross-entity ownership/scope checks:
- Business-state and quantity/value checks:

## 10. UI
- Screens, forms, lists, and workflow actions:
- Role-specific behavior and accessibility:
- Loading, empty, validation, and error states:

## 11. Reports
- Required registers, statements, summaries, and filters:
- Export/print requirements:
- Source-of-truth records and reconciliation:

## 12. Tests
- Unit/calculation tests:
- API/service and database transaction tests:
- Permission/tenant-boundary tests:
- Inventory/accounting reconciliation tests:
- UI or end-to-end coverage:

## 13. Implementation and verification
- Files/modules changed:
- Migration applied/verified:
- Tests and builds run:
- Implemented scope:
- Remaining gaps:
```

## Completion criteria

Do not mark a module complete unless the documented workflow is implemented end-to-end, required stock and accounting effects reconcile, permissions and tenant boundaries are tested, validations return actionable errors, reports are accounted for, and verification results are recorded. An explicitly excluded feature may remain outside scope only when its boundary is documented and no incomplete action is presented as working.

The existing phase documents describe specific delivered scopes but are not automatically proof that every module has passed this full checklist. Reconcile and extend them as each module is revisited in its scheduled sequence.
