# Phase 1 implementation notes

## Delivered foundation

The Prisma schema defines tenant, factory, user, role, permission, session, settings, audit, and the core operational/accounting records needed to preserve future traceability. Phase 1 API modules establish company, factory, user, auth, and settings boundaries. All secret values belong in environment variables. Passwords are hashed; refresh tokens are stored only as hashes and rotated.

## Phase 1 workflows

1. Platform administrator creates a company and its first owner membership.
2. Owner creates factories and company settings, then assigns users roles and optional factory scopes.
3. Login issues a short-lived access token and opaque refresh token. Refresh rotates the stored token hash; logout revokes the session. Failed attempts are throttled and lockout state is recorded.
4. Every request resolves an active user membership and permissions before serving tenant data.

## Required configuration

`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_DAYS`, and `APP_URL`. `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are required by the seed command. Password reset, email verification, and email OTP delivery require `SMTP_HOST`, `SMTP_FROM`, and any authentication settings; the API reports delivery unavailable when SMTP is missing. No development secret is safe for production.

## Phase 1 API

- `POST /api/v1/auth/login`, `/refresh`, `/logout`; `GET /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/:sessionId`
- `POST /api/v1/auth/password-reset/request`, `/password-reset/complete`
- `POST /api/v1/auth/email-verification/request`, `/email-verification/complete`
- `POST /api/v1/auth/otp/request`, `/otp/verify`
- `GET /api/v1/auth/login-history`
- `GET /api/v1/companies`, `POST /api/v1/companies`
- `GET /api/v1/companies/capabilities`, `GET /api/v1/companies/:companyId`, `PATCH /api/v1/companies/:companyId`
- `GET /api/v1/factories`, `GET /api/v1/factories/:factoryId`, `POST /api/v1/factories`, `PATCH /api/v1/factories/:factoryId`
- `GET /api/v1/factories/capabilities`
- `GET /api/v1/users`, `POST /api/v1/users`
- `GET /api/v1/roles`, `POST /api/v1/roles`, `PATCH /api/v1/roles/:roleId`
- `POST /api/v1/roles/:roleId/assignments`, `DELETE /api/v1/roles/:roleId/assignments/:membershipId?companyId=...`
- `GET /api/v1/roles/permissions`
- `GET /api/v1/settings/company`, `PUT /api/v1/settings/company`

Authentication routes include rotating refresh tokens, per-user session control, email/OTP recovery and persisted login history. Tenant routes require active access tokens and role grants; requests enforce company/factory scope and deny access by default. See [authentication.md](./authentication.md) for credential, lockout, device, and recovery behavior. Session and login-history APIs expose only authenticated-user records and never return refresh-token hashes. The Company profile screen manages the company legal/contact record and fiscal/currency defaults; platform creation transactionally sets up an owner role and membership. See [company-master.md](./company-master.md) for its fields, permissions, workflow, and boundaries. Role creation and assignment cannot grant permissions the caller does not hold; assignment verifies the target membership belongs to the company. Factory master data is audited, company-scoped, and deactivation blocks operational writes while retaining historical records; see [factory-master.md](./factory-master.md). Settings are stored as a JSON object and replaced on `PUT`. Configure unique secrets and review the bootstrap account before exposing the system to untrusted clients. See [rbac.md](./rbac.md) for role-management rules and [architecture.md](./architecture.md) for API envelope and pagination conventions.
