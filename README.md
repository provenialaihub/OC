# Onaply

Onaply is a reliability-first operating system for complex business workflows.

It is being built to make high-complexity operations easier to:
- trust
- automate safely
- explain
- recover when things go wrong
- connect to current and future tools without being trapped by them

## What Onaply is
Onaply is not just an inventory tool, an accounting sync utility, or an AI wrapper.

It is being built as an operational trust layer across workflows like:
- receiving
- inventory control
- holds and releases
- compliance handling
- accounting event generation
- connector-based external sync
- bounded AI-assisted operation

## Why it exists
Most companies trying to automate operational workflows run into the same failures:
- truth is fragmented across tools
- automations are brittle
- AI layers are hard to trust
- integrations create drift instead of clarity
- operators spend time reconciling system confusion instead of running the business

Onaply is being built to solve that category of problem.

## Current build direction
The system is currently being built with these principles:
- **Onaply owns operational truth**
- **external systems are connectors, not the core model**
- **exceptions are first-class**
- **AI access must be bounded by trust policy**
- **portability is a design constraint, not a future wish**

## Current state
Onaply is in active build mode with the following foundations materially in place:
- suppliers, items, purchasing, receiving
- movement-ledger inventory balances
- hold/release and adjustment workflows
- compliance issue surfacing
- provider-neutral accounting bridge
- blocked/reconciliation accounting controls
- QuickBooks OAuth + token lifecycle foundation
- trust, UX, portability, and investor-facing architecture docs

For the latest checkpoint, see:
- [`STATUS.md`](./STATUS.md)

## Foundation docs
These are the current anchor documents for understanding the system:

### Core architecture / strategy
- [`docs/architecture-overview.md`](./docs/architecture-overview.md)
- [`docs/investor-technical-overview.md`](./docs/investor-technical-overview.md)
- [`docs/cloud-portability-readiness.md`](./docs/cloud-portability-readiness.md)

### Trust / product operating model
- [`docs/ai-agent-access-trust-model.md`](./docs/ai-agent-access-trust-model.md)
- [`docs/exception-first-ux-spec.md`](./docs/exception-first-ux-spec.md)

### Build / migration notes
- [`docs/migrations.md`](./docs/migrations.md)

### Working memory/spec references
- `../memory/SaasBuild/onaply-company-foundation-2026-03-13.md`
- `../memory/SaasBuild/onaply-architecture-foundations-v1.md`
- `../memory/SaasBuild/onaply-domain-schema-v1.md`
- `../memory/SaasBuild/onaply-permission-tenancy-model-v1.md`
- `../memory/SaasBuild/onaply-connector-framework-v1.md`
- `../memory/SaasBuild/onaply-failure-mode-checklist-v1.md`
- `../memory/SaasBuild/onaply-v1-screen-spec.md`
- `../memory/SaasBuild/onaply-build-roadmap-v1.md`

## What has been done right now
Major milestones already landed include:
1. inventory trust baseline
2. operator-facing inventory controls
3. compliance issue model and review surfaces
4. provider-neutral accounting bridge
5. accounting hardening (blocked states, reconciliation, readiness)
6. QuickBooks OAuth/token health foundation
7. foundational trust/UX/portability/investor docs

## What is still incomplete
The architecture is serious, but the build is not being represented as finished.
Current major gaps include:
- mapping setup UI/actions
- reconciliation resolution flow
- real QuickBooks export implementation
- stronger production-grade secret handling
- more mature exception-first operator command surface

## Why this may become defensible
If executed well, Onaply’s differentiation is likely to come from the combination of:
- trust architecture
- exception-first operations
- explainability
- bounded AI-agent access
- connector portability
- operator UX in complex workflows

## Local development
### Setup
```bash
cp .env.example .env
# set DATABASE_URL first
# set DEV_ORG_SLUG and DEV_USER_EMAIL for local auth bootstrap
npm run db:generate
npm run db:push
npm run db:seed
```

### Local auth bootstrap
Until real auth is fully wired, tenant context is resolved from:
- `DEV_ORG_SLUG`
- `DEV_USER_EMAIL`
- optional request headers `x-onaply-org-slug` / `x-onaply-user-email`

`npm run db:seed` creates a default active operator membership for `DEV_USER_EMAIL`.

## Build conventions
- Parse incoming form payloads with Zod in `src/lib/validation/*`
- Re-validate service inputs before writing
- Throw typed errors from `src/lib/errors/service-errors.ts`
- Gate pages/actions with `requireTenantAccess(...)`
- Preserve migration discipline and avoid schema drift shortcuts

## Backup discipline
- local commits happen often
- remote backup happens at meaningful checkpoints only
- Onaply is backed up off-machine through subtree-based milestone pushes
- do not push the entire workspace as product backup

## Current goal
The current goal is to turn a strong technical foundation into a product that is:
- simpler for operators
- safer for automation
- more legible to collaborators and investors
- portable enough to scale beyond local build mode
