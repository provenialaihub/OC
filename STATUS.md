# Onaply Build Status

_Last updated: 2026-03-13 21:55 CT_

## Current state
Onaply is in active build mode with the operational core, inventory control loop, compliance surfacing, and accounting bridge foundation in place.

## Latest safe backup
- Remote backup repo: `provenialaihub/OC`
- Backup branches:
  - `backup/onaply-2026-03-13-checkpoint`
  - `backup/onaply-latest`
- Backup method: `onaply/` subtree push only (not whole workspace)

## Major milestones completed
1. Inventory trust baseline
   - idempotency
   - hold release
   - inventory adjustments
   - migration discipline
2. Operator-facing inventory controls
   - lot detail
   - hold release UI
   - quick adjustment UI
3. Compliance layer
   - compliance issue model
   - auto-generation from held/discrepant receipts
   - compliance review screens
4. Provider-neutral accounting bridge
   - connections
   - mappings
   - accounting events
   - export attempts
5. Accounting hardening
   - blocked state
   - reconciliation issues
   - readiness validation
6. QuickBooks connection lifecycle
   - OAuth start/callback
   - encrypted token storage path
   - refresh flow
   - health checks
7. Deep-search system hardening
   - Tavily-first mandatory protocol
   - GitHub fallback sanitization
   - X failure isolation/reporting

## Latest important commits
- `408acd1` — Add QuickBooks token refresh and health checks
- `f044ef7` — Add QuickBooks OAuth start and callback flow
- `b35ca1b` — Harden accounting connection, mapping, and reconciliation flow
- `3df9b6f` — Harden accounting outbox and add QuickBooks runner skeleton
- `4d9efae` — Add provider-neutral accounting bridge foundation
- `146d227` — Add compliance issue tracking and review surfaces
- `33147ed` — Add inventory lot detail and action surfaces
- `e9e07f3` — Add inventory trust baseline for holds and adjustments

## What is still incomplete
- mapping setup UI/actions
- real QuickBooks export implementation in the runner
- reconciliation resolution flow
- stronger long-term secret-storage posture
- cleaner permanent remote/repo setup for Onaply backups

## Next recommended steps
1. build mapping setup UI/actions
2. implement live QuickBooks export path
3. add reconciliation resolution controls
4. maintain milestone-only off-machine backups

## Backup policy
- Local commits often
- Remote push only at important milestones
- Never push whole workspace
- Only push `onaply/` subtree for backup branches
