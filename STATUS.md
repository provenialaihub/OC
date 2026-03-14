# Onaply Build Status

_Last updated: 2026-03-13 23:06 CT_

## What this is
This file is the fastest way to understand the current state of the Onaply build.

Use it to answer:
- what are we building?
- what has been completed?
- what is safe/current?
- what is still missing?
- what happens next?

## Current state
Onaply is in active build mode with the operational core, trust architecture, exception-first product direction, compliance surfacing, and accounting bridge foundation in place.

## Core company/product direction
Onaply is being built as a **reliability-first operating system for complex workflows**.

Current strategic priorities are:
1. make a highly complex system feel simple and trustworthy to operators
2. wire automation wherever it is safe and useful
3. allow high-leverage AI-agent access without security breaches or silent operational damage
4. keep integrations portable so the system can connect broadly now and in the future
5. preserve cloud portability instead of hardening local-machine shortcuts into product debt

## Latest safe backup
- Remote backup repo: `provenialaihub/OC`
- Backup branches:
  - `backup/onaply-latest`
  - `backup/onaply-2026-03-13-checkpoint`
- Backup method: `onaply/` subtree push only (not whole workspace)

## Major milestones completed
1. **Inventory trust baseline**
   - idempotency
   - hold release
   - inventory adjustments
   - migration discipline

2. **Operator-facing inventory controls**
   - lot detail
   - hold release UI
   - quick adjustment UI

3. **Compliance layer**
   - compliance issue model
   - auto-generation from held/discrepant receipts
   - compliance review screens

4. **Provider-neutral accounting bridge**
   - connections
   - mappings
   - accounting events
   - export attempts

5. **Accounting hardening**
   - blocked state
   - reconciliation issues
   - readiness validation

6. **QuickBooks connection lifecycle**
   - OAuth start/callback
   - encrypted token storage path
   - refresh flow
   - health checks

7. **Search and build intelligence hardening**
   - Tavily-first mandatory protocol
   - GitHub expansion
   - X expansion
   - YouTube integration
   - Hacker News integration
   - freshness mode
   - verification-query splitting

8. **Foundation documentation stack**
   - AI agent access & trust model
   - architecture overview
   - exception-first UX spec
   - cloud portability readiness spec
   - investor technical overview

## Latest important commits
- `ddd32ac` — Draft investor technical overview
- `da70105` — Draft cloud portability readiness spec
- `0e7d0e5` — Draft exception-first UX spec
- `02ad117` — Draft Onaply architecture overview
- `bc64468` — Draft AI agent access trust model
- `8c6629b` — Wire YouTube key and add Hacker News to deep search
- `2518134` — Lock and wire canonical deep search protocol
- `408acd1` — Add QuickBooks token refresh and health checks
- `f044ef7` — Add QuickBooks OAuth start and callback flow
- `b35ca1b` — Harden accounting connection, mapping, and reconciliation flow

## What is still incomplete
### Product / operator layer
- true operator home / today command surface
- approvals queue
- blocked/reconciliation queue UX
- recent AI/system actions stream

### Accounting/integration layer
- mapping setup UI/actions
- live QuickBooks export implementation
- reconciliation resolution flow

### Platform layer
- stronger production-grade secret handling
- cleaner permanent dedicated remote/repo structure
- more explicit worker/runtime separation as cloud-readiness hardening

## What is safe to say externally right now
We can credibly say that:
- the company is building reliability infrastructure for complex workflows
- the architecture is being built around operational truth, bounded automation, and connector portability
- trust, explainability, and recoverability are being treated as first-class design constraints

We should **not** yet imply that:
- the accounting bridge is fully production-complete
- all operator-facing UX is finished
- the cloud portability path is fully implemented end-to-end

## Next recommended steps
1. build mapping setup UI/actions
2. build reconciliation resolution flow
3. implement live QuickBooks export path
4. build the exception-first operator home / approvals / blocked queue surfaces
5. continue milestone-only off-machine backups

## Documentation map
- product/company overview: [`README.md`](./README.md)
- docs index: [`docs/README.md`](./docs/README.md)
- architecture overview: [`docs/architecture-overview.md`](./docs/architecture-overview.md)
- trust model: [`docs/ai-agent-access-trust-model.md`](./docs/ai-agent-access-trust-model.md)
- UX spec: [`docs/exception-first-ux-spec.md`](./docs/exception-first-ux-spec.md)
- portability spec: [`docs/cloud-portability-readiness.md`](./docs/cloud-portability-readiness.md)
- investor overview: [`docs/investor-technical-overview.md`](./docs/investor-technical-overview.md)

## Backup policy
- local commits often
- remote push only at important milestones
- never push the whole workspace as product backup
- only push `onaply/` subtree for backup branches
