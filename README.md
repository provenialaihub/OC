# Onaply

Onaply is the operations intelligence platform being built first for Blue Gourmet and designed to expand to other physical-product businesses.

## Current status
Phase 0 scaffold complete.

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
2. suppliers + item foundation
3. receiving + inventory truth
4. purchasing + compliance basics
5. accounting bridge
6. production + traceability
