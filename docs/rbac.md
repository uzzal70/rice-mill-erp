# Role-based access control

## Permission model

Permissions are records identified by `(resource, action)`. Supported actions are `CREATE`, `READ`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `POST`, `PRINT`, `EXPORT`, and `VIEW_FINANCIAL`. Roles grant permission records through `RolePermission`; users receive roles through a company or factory-scoped membership. The API denies access by default and checks permission grants on each protected request.

The seed creates the required 23 default role codes: `SUPER_ADMIN`, `OWNER`, `DIRECTOR`, `GENERAL_MANAGER`, `FACTORY_MANAGER`, `ACCOUNTS_MANAGER`, `ACCOUNTANT`, `PURCHASE_MANAGER`, `PURCHASE_OFFICER`, `GATE_OPERATOR`, `WEIGHBRIDGE_OPERATOR`, `LAB_TECHNICIAN`, `STORE_MANAGER`, `PRODUCTION_MANAGER`, `PRODUCTION_OPERATOR`, `SALES_MANAGER`, `SALES_OFFICER`, `DISPATCH_OFFICER`, `HR_MANAGER`, `HR_OFFICER`, `DRIVER`, `AUDITOR`, and `VIEWER`.

The role templates use least-privilege module grants: platform administration is separate from tenant ownership; purchase, gate, laboratory, store, production, sales, dispatch, finance, and HR roles receive grants for their respective operational domains. `OWNER` receives tenant permissions except platform-only company creation. `AUDITOR` and `VIEWER` receive read/export grants, with financial visibility explicitly assigned to the auditor template. A tenant administrator can adjust company-role grants.

## Role administration API

- `GET /api/v1/roles?companyId=...` — list company roles and grants, plus platform system roles.
- `GET /api/v1/roles/permissions` — list the permission catalog.
- `POST /api/v1/roles` — create a company role; requested grants must be held by the administrator.
- `PATCH /api/v1/roles/:roleId` — update the name, description, or complete permission grant set for a company role. Pass `permissionIds: []` to clear grants. System roles cannot be changed through this endpoint.
- `POST /api/v1/roles/:roleId/assignments` — assign a company role to a membership in the same company.
- `DELETE /api/v1/roles/:roleId/assignments/:membershipId?companyId=...` — revoke a company-role assignment.

The API rejects unknown permissions, cross-company role/membership combinations, system-role edits, and any grant the requesting administrator does not already hold. Role creation, grant changes, and assignment changes are written to the audit log in the same database transaction.

The frontend **Roles & permissions** screen provides company-role selection and grant editing. It relies on server-side authorization as the authority and displays API errors for insufficient grants. Custom-role creation and assignment/revocation remain API-only; a user/membership assignment UI is not implemented yet.

## Scope behavior

Company-wide memberships can use company roles across the company's factories. Factory-scoped memberships only authorize requests for their assigned factory and use role grants attached to that membership. The global `SUPER_ADMIN` role is a platform role, not a company role. Company administrators cannot create a permission the administrator does not hold or assign a role containing grants beyond their own permissions.
