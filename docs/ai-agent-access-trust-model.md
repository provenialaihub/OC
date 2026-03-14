# Onaply AI Agent Access & Trust Model

_Last updated: 2026-03-13 22:48 CT_
_Status: Draft v1_

## Purpose
Define how AI agents are allowed to interact with Onaply so the system can maximize useful automation without creating security breaches, silent financial damage, inventory corruption, or operator distrust.

This is the policy wall between:
- high-leverage automation
- unsafe autonomous behavior

## Core principles

### 1. Operational truth beats automation convenience
Agents may never bypass the system-of-record rules for inventory, compliance, accounting events, mappings, or audit history.

### 2. Every agent action must fit a trust tier
No fuzzy permissions. Every capability belongs to one of the defined trust classes below.

### 3. Financial and inventory-impacting writes are high-risk by default
If an action can change inventory availability, accounting posture, external system state, or compliance status, it must be explicitly governed.

### 4. Agents should reduce ambiguity, not create it
If an agent cannot explain what it did, why it did it, and what data it used, that action is not trustworthy enough.

### 5. Human oversight is a product feature, not a fallback
Approvals, blocked states, reconciliation, and recommendations are core operating flows.

---

## Trust tiers

## Tier 0 — Forbidden
Actions agents may not perform under any normal autonomous mode.

### Examples
- modifying secrets or credential config
- changing auth/permission policies
- deleting audit history
- deleting reconciliation records to hide failures
- making irreversible destructive data changes without explicit human command
- silently changing mappings that alter financial meaning
- directly mutating inventory balances outside approved movement/event paths
- executing broad connector-side destructive operations

### Rule
If a capability lives here, the agent may only assist by:
- explaining
- proposing
- generating a draft plan

Never execute.

---

## Tier 1 — Read-only intelligence
Agents may inspect and analyze, but not change state.

### Allowed
- read suppliers, items, receipts, purchase orders, holds, balances, issues, mappings
- inspect accounting event and reconciliation state
- inspect system health / logs / sync outcomes
- summarize workflows and detect anomalies
- propose likely next actions

### Constraints
- no data mutation
- no external write calls
- no secret disclosure

### Typical use cases
- "What is blocked right now?"
- "Why did this export fail?"
- "What are the top risk areas today?"
- "What changed in the last 24 hours?"

---

## Tier 2 — Draft / propose
Agents may prepare changes, but not apply them.

### Allowed
- draft supplier/vendor mappings
- draft item/account mappings
- draft reconciliation resolutions
- draft suggested hold release actions
- draft suggested inventory adjustments
- draft connector retry plans
- draft operator-facing summaries or approval packets

### Constraints
- output must be clearly marked as draft/proposed
- no mutation to core records without approval path
- no external connector execution

### Required output format
Every draft must include:
- proposed action
- why it is recommended
- source evidence / data used
- risk level
- required human approval status

---

## Tier 3 — Approval-required writes
Agents may execute only after explicit operator approval.

### Allowed with approval
- release inventory hold
- create inventory adjustment
- resolve compliance issue
- apply accounting mapping
- retry blocked accounting export
- initiate external connector export with financial implications
- modify supplier-critical operational records

### Required conditions
- explicit approval event recorded
- action payload captured before execution
- audit event written after execution
- correlation id attached
- rollback/recovery path known where possible

### UI requirement
These actions should appear in an approvals queue or equivalent operator confirmation surface.

---

## Tier 4 — Bounded autonomous operations
Agents may execute without manual approval only inside low-risk, explicitly bounded workflows.

### Allowed
- health checks
- read-only sync validation
- connector health probing
- token refresh / non-destructive auth health maintenance
- retry clearly idempotent, non-destructive background jobs
- generate/update status summaries
- create reconciliation issues when blocked conditions are detected
- send internal alerts/reminders

### Constraints
- must be idempotent or safely repeatable
- must not alter financial meaning or inventory truth directly
- must write audit/log trail
- must stop and escalate when confidence is low or ambiguity is high

---

## Tier 5 — Controlled autonomous recovery
Agents may autonomously recover from known low-risk failure modes inside a tightly bounded policy.

### Example candidates
- retry failed accounting export after auth refresh if mappings are already valid
- re-run non-destructive connector sync after transient timeout
- reopen health-check issue if service degrades again
- regenerate a report or summary artifact if upstream formatting fails

### Not allowed here
- changing mappings automatically
- changing inventory or accounting meaning automatically
- resolving compliance/financial issues automatically without bounded explicit policy

### Requirements
- action policy documented
- max retry counts enforced
- failure classification required
- automatic escalation to human after bounded attempts

---

## Trust matrix by domain

| Domain | Read | Draft | Approval-required write | Bounded autonomous | Forbidden autonomous |
|---|---:|---:|---:|---:|---:|
| Inventory visibility | yes | n/a | n/a | yes | no |
| Hold release | yes | yes | yes | no | yes |
| Inventory adjustments | yes | yes | yes | no | yes |
| Compliance issue creation | yes | yes | yes (resolution) | yes (creation only) | no |
| Supplier/vendor mapping | yes | yes | yes | no | yes |
| Item/account mapping | yes | yes | yes | no | yes |
| Accounting export retry | yes | yes | yes | yes (low-risk retry only) | no |
| Connector auth health | yes | n/a | n/a | yes | no |
| Secrets/credentials | no | no | no | no | yes |
| Permission/policy changes | yes (view) | yes (draft policy) | human-only | no | yes |

---

## Agent personas and allowed ceilings

## Operator assistant agent
Primary role:
- summarize state
- recommend actions
- prepare approvals

Max default ceiling:
- Tier 2

## Workflow automation agent
Primary role:
- execute bounded background workflows
- create alerts/issues
- retry safe jobs

Max default ceiling:
- Tier 4

## Reconciliation agent
Primary role:
- analyze blocked events
- suggest mappings / retry plans
- optionally execute approved retries

Max default ceiling:
- Tier 3

## Connector maintenance agent
Primary role:
- auth health
- token refresh
- provider connectivity checks
- low-risk sync maintenance

Max default ceiling:
- Tier 4

## Admin/security agent
Primary role:
- explain settings and produce change plans

Max default ceiling:
- Tier 2 by default
- secret/policy mutation remains human-only unless explicitly changed by JP in future governance

---

## Approval policy
Any action requiring approval must capture:
- actor requesting the action
- agent identity / workflow identity
- exact proposed mutation
- justification
- risk class
- affected records / systems
- operator decision
- execution result
- audit correlation id

Approval-required actions must never be transformed significantly between proposal and execution without re-approval.

---

## Explainability requirements
For every non-read-only agent action, the system should be able to answer:
1. What did the agent do?
2. Why did it do it?
3. What data did it rely on?
4. What policy/tier allowed it?
5. Did a human approve it?
6. What changed as a result?
7. How would we recover if it was wrong?

---

## Security boundaries

### Hard boundaries
- no secret values in user-facing logs or agent summaries
- no raw credential mutation by agents
- no external connector write calls without explicit domain authorization
- no cross-tenant data access
- no permission escalation by prompt or workflow trickery

### Operational boundaries
- every agent action must run with tenant context
- every high-risk write must go through service-layer policy checks
- every external write must be attributable to a connection + actor + correlation id
- every autonomous recovery loop must have a retry ceiling and escalation rule

---

## Implementation requirements for Onaply

### Immediate requirements
1. define action categories in code
2. map each action to a trust tier
3. add policy checks before service-layer mutation paths
4. add approval queue support for Tier 3 actions
5. expose recent AI actions / rationale in UI
6. log correlation ids for agent-originated actions

### Near-term requirements
1. add bounded retry policy objects for connector/worker actions
2. add agent identity metadata to audit events
3. add resolution tracking for agent-proposed vs human-approved changes
4. add low-confidence escalation behavior

---

## Actions to classify next in code
- releaseInventoryHold
- createInventoryAdjustment
- updateComplianceIssueStatus
- upsertAccountingMapping
- recordAccountingExportAttempt / export runner execution
- connector token refresh
- connection health check
- future supplier sync imports
- future PO/receipt automation flows

---

## Non-goals
This model does not try to:
- maximize autonomy at all costs
- remove humans from critical operations
- pretend approval is unnecessary for high-impact changes

It exists to maximize safe leverage.

---

## Product promise implied by this model
Onaply should feel like:
- highly automated
- deeply helpful
- clearly bounded
- easy to trust

Not like:
- a black box
- an overpowered agent loose in the ledger
- a financial/inventory system that hopes nothing goes wrong
