# Rice Mill ERP

Bangladesh-focused, multi-company rice mill operations platform. Development follows the phased design described in [the architecture](docs/architecture.md), the [research basis](docs/research-basis.md), the [technology stack](docs/technology-stack.md), and the [module development standard](docs/module-development-standard.md).

## Repository layout

- `frontend/` — Next.js and Material UI application
- `backend/` — NestJS REST API
- `database/prisma/` — PostgreSQL Prisma schema
- `docs/` — architecture and phase documentation
- `docker-compose.yml` — local PostgreSQL development service

## Current state

Implemented backend work covers identity/RBAC, company/factory administration, partner and product masters, unit conversion, vehicle/gate/weighbridge/quality workflows, paddy procurement, GRNs, warehouse, stock ledger, milling-batch recovery, drying, and parboiling stock workflows, with tenant permissions and audit events. The frontend provides English/Bangla UI language switching, Advanced/Classic appearance modes, and connected screens for gate and quality operations, paddy procurement, GRN posting, and warehouse stock. PostgreSQL migrations, a bootstrap/demo seed, and API unit tests are included.

This remains a staged implementation, not a complete or production-ready ERP. Production costing/UI, sales, accounting posting, HR/payroll, and several other requested domains are not implemented. Review [Phase 3](docs/phase-3.md), [Phase 4](docs/phase-4.md), and [Phase 5](docs/phase-5.md) for implemented workflows and boundaries.

## Local API setup

1. Use Node.js 20 or later and Docker Compose, or PostgreSQL 15 or later installed locally.
2. To start the local PostgreSQL service with Docker Compose, run `docker compose up -d postgres` from the project root. The default local connection URL is `postgresql://rice_mill:local-dev-only@localhost:5432/rice_mill_erp?schema=public`.
3. Install backend dependencies with `cd backend && npm install`.
4. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`, unique random JWT secrets of at least 32 characters, `APP_URL`, and the bootstrap administrator email/password. Configure SMTP settings to deliver password reset, email verification, and OTP messages.
5. Generate Prisma Client with `npm run prisma:generate`.
6. Apply all committed migrations with `npm run prisma:deploy`.
7. Seed the permission catalog, demo company/factories/godowns, sample vehicles, partners, paddy/rice/by-product/packaging items, default roles, unit conversions, and bootstrap account with `npm run prisma:seed`.
8. Start the API with `npm run start:dev`; Swagger is at `/api/docs`.

Use `npm run prisma:migrate` to create and review a new migration during schema development. The seed uses the `BOOTSTRAP_ADMIN_*` variables and is safe to rerun; it does not replace an existing administrator password.
Run the API unit suite with `npm test` and compile with `npm run build` from `backend/`.

Do not expose this scaffold to an untrusted network. Configure authentication, tenant authorization, migration review, secrets, logging, and deployment controls before use.

## Local frontend setup

1. Use Node.js 20.9 or later.
2. Copy `frontend/.env.example` to `frontend/.env.local` and set `NEXT_PUBLIC_API_URL` to the reachable API base URL (default: `http://localhost:4000/api/v1`).
3. Install and start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

4. Open `http://localhost:3000`. Sign in with the bootstrap administrator configured for the API.

Check the frontend with `npm run typecheck` and create a production build with `npm run build`, both from `frontend/`. The API must allow the frontend origin through its CORS configuration.
# rice-mill-erp
