# AIMI API foundation

Fastify + TypeScript + PostgreSQL. Run from the repository root:

```sh
npm ci
npm run build:api
npm test
npm run db:migrate
npm run test:db
npm run start:api
```

Local settings load from `apps/api/.env.local`; deployed variables take precedence. Never commit this file. `DATABASE_URL` uses the limited `aimi_api` role; `MIGRATION_DATABASE_URL` is administrative and is never needed by the deployed API.

`npm run db:provision --workspace @aimi/api` is a one-time bootstrap after migration; it refuses to replace an existing role. Do not rerun it for credential rotation.

## Endpoints

- `GET /health/live`: process status.
- `GET /health/ready`: DB/migration readiness.
- `GET /wallet`, `GET /home`: valid Bearer session required.
- `POST /daily-rewards/:type/claim`: empty JSON and `Idempotency-Key` (8–128 letters/digits/underscores/hyphens). Atomic wallet, ledger, daily claim and response persistence.
- `POST /auth/logout`: revokes the session.
- `POST /auth/toss`: returns `TOSS_AUTH_NOT_CONFIGURED`; actual Toss server authentication is not implemented.

For local-only testing, set `ENABLE_DEV_AUTH=true`, `HOST=127.0.0.1`, and a non-production environment, then POST `/auth/dev` with `{"subject":"local-tester"}`. This is blocked on Render and production. Development reward policy is attendance 5 / tip 3 EP; production claims are unavailable until a reviewed production policy is implemented.

The server-only schema is `aimi`, not `public`. The miniapp still uses its original in-memory demo and is not wired to these endpoints.

## Render

Node 22.22.0; root directory empty; build `npm ci && npm run build:api`; start `npm run start:api`; readiness `/health/ready`. Set `NODE_ENV=production`, `HOST=0.0.0.0`, `ENABLE_DEV_AUTH=false`, runtime `DATABASE_URL`, and a separate random `SESSION_SIGNING_KEY`. Never deploy migration/admin credentials. Startup does not execute DDL.

## Checks

`npm run test:db` creates a unique synthetic user, verifies concurrent rewards/retries, midnight idempotency, ledger totals and session revocation, then removes only that test user's data. CI runs it against disposable PostgreSQL with no external keys.
