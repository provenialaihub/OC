# Onaply

Onaply is the operations intelligence platform being built first for Blue Gourmet and designed to expand to other physical-product businesses.

## Current status
Phase 0 scaffold complete with an initial guardrail pass for tenant enforcement, action-level permission checks, validated write paths, and typed service errors.

## Architecture direction
- Next.js app shell
- Postgres-centered canonical data model
- inventory movement ledger
- modular monolith
- worker-backed async jobs
- QuickBooks as accounting bridge, not schema owner

## Foundation specs
Canonical specs live in:
- `../memory/SaasBuild/onaply-architecture-foundations-v1.md`
- `../memory/SaasBuild/onaply-domain-schema-v1.md`
- `../memory/SaasBuild/onaply-permission-tenancy-model-v1.md`
- `../memory/SaasBuild/onaply-connector-framework-v1.md`
- `../memory/SaasBuild/onaply-failure-mode-checklist-v1.md`
- `../memory/SaasBuild/onaply-v1-screen-spec.md`
- `../memory/SaasBuild/onaply-build-roadmap-v1.md`

## Near-term build order
1. auth + tenancy base
2. database + migrations + seed path
3. suppliers + item foundation
4. receiving + inventory truth
5. purchasing + compliance basics
6. accounting bridge
7. production + traceability

## Database commands
```bash
cp .env.example .env
# set DATABASE_URL first
# set DEV_ORG_SLUG and DEV_USER_EMAIL for local auth bootstrap
npm run db:generate
npm run db:push
npm run db:seed
```

## Local auth bootstrap
Until real auth is wired, tenant context is resolved from:
- `DEV_ORG_SLUG`
- `DEV_USER_EMAIL`
- optional request headers `x-onaply-org-slug` / `x-onaply-user-email`

`npm run db:seed` creates a default active operator membership for `DEV_USER_EMAIL`.

## Validation + service conventions
- Parse incoming form payloads with Zod in `src/lib/validation/*`
- Re-validate service inputs before writing
- Throw typed errors from `src/lib/errors/service-errors.ts`
- Gate pages/actions with `requireTenantAccess(...)`

## Migration discipline
See `docs/migrations.md` for the current migration naming and workflow convention.
