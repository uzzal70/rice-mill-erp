# Technology stack

## Application boundaries

The frontend and backend are separate deployable applications. The frontend calls the backend REST API and does not connect to PostgreSQL. The backend owns authorization, validation, business rules, inventory/accounting effects, and persistence. PostgreSQL is the source of truth; Prisma schema and ordered migrations are kept under `database/prisma/`.

| Layer | Selected technology | Current project status |
|---|---|---|
| Web application | Next.js App Router, React, TypeScript | In use under `frontend/` |
| UI | Material UI | In use |
| Forms and validation | React Hook Form, Zod, `@hookform/resolvers` | Added for frontend forms |
| Server-state cache | TanStack Query | Added and mounted at the app root |
| Client-global state | Redux Toolkit only when shared client state requires it | Not installed; no current need |
| Charts | Recharts | Selected for future reporting and analytics |
| REST backend | NestJS, TypeScript | In use under `backend/` |
| Authentication/API | JWT access tokens, refresh sessions, RBAC, Swagger/OpenAPI | Implemented in backend foundation |
| Database access | Prisma ORM | In use |
| Database | PostgreSQL 15+ | Local development can use Docker Compose |
| Local infrastructure | Docker Compose | PostgreSQL service and persistent volume are provided in the root compose file |
| Production edge | Nginx | Reserved for deployment configuration; not yet configured |
| Cache/queues | Redis when a real cache or background-job use case is implemented | Not provisioned or used yet |
| File storage | Storage adapter, with a production object-storage provider to be selected | Persistent object storage is not yet implemented |

Dependency installation alone does not make an unfinished workflow available. Libraries are added as stack foundations; individual modules still need to use them for their own validated forms, data fetching, charts, and tests.

## Directory layout

```text
frontend/                 Next.js application
backend/                  NestJS REST API
database/prisma/           PostgreSQL schema and migrations
docs/                      Architecture and workflow documentation
docker-compose.yml          Local PostgreSQL development service
```

The deployment phase may add production Dockerfiles, Nginx routing/TLS, object storage, Redis-backed jobs, backup/restore, and operational hardening. The local Compose password default is for development only; never use it for production.

## Local database

Start the local PostgreSQL service with `docker compose up -d postgres`. The default connection URL for host-run backend commands is:

```text
postgresql://rice_mill:local-dev-only@localhost:5432/rice_mill_erp?schema=public
```

Set `DATABASE_URL` in `backend/.env`, then run Prisma client generation, migrations, and seed as described in the root [README](../README.md). Override the Compose credentials and port with environment variables for local environments that require different values.
