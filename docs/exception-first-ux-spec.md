# Onaply Exception-First UX Specification

_Last updated: 2026-03-13 22:58 CT_
_Status: Draft v1_

## Purpose
Define the product experience for operating a highly complex system in a way that feels clear, trustworthy, and manageable.

This specification exists because Onaply is not just a workflow engine or a ledger-backed backend. It is meant to help operators manage complexity without drowning in it.

The UX should optimize for:
- clarity under pressure
- fast issue recognition
- guided resolution
- visible system trust
- safe use of AI assistance

---

## Core UX thesis
The product should not be organized around schemas, tables, or technical primitives.
It should be organized around:
- what needs attention
- what changed
- what is blocked
- what the system recommends
- what the operator should do next

### The product promise
A user should feel:
- "I know what matters right now"
- "I know what the system already handled"
- "I know what is blocked and why"
- "I know what the AI is suggesting"
- "I can act safely without guessing"

---

## Primary UX principles

### 1. Exception-first, not record-first
Do not force operators to browse records to discover problems.
Show them exceptions, risks, and required actions first.

### 2. Task-first, not schema-first
Users should think in terms of actions like:
- receive shipment
- resolve hold
- fix mapping
- retry export
- approve action
not:
- browse `inventory_hold`
- inspect `accounting_event`
- edit abstract rows

### 3. Confidence should be visible
Every important screen should help answer:
- is this safe?
- is this complete?
- what is uncertain?
- what is blocked?

### 4. AI should narrow choices, not expand confusion
AI should surface:
- ranked recommendations
- likely root causes
- suggested next steps
- risk notes
Not vague prose or too many options.

### 5. The system should feel alive, not mysterious
Operators should see:
- recent actions
- health state
- retries
- blocked flows
- changes over time
without opening five screens.

---

## UX categories

## 1. Needs Attention
This is the most important product surface.

### Purpose
Show the operator what requires attention now.

### Should include
- blocked accounting exports
- compliance issues
- active holds
- failed syncs
- pending approvals
- low-confidence AI suggestions
- stale unresolved exceptions

### Design rules
- sorted by severity + urgency
- each item must have a clear reason
- each item must have a next recommended action
- each item must indicate whether approval is required

---

## 2. Workflows in progress
Show the user what the system is currently doing or waiting on.

### Examples
- export in progress
- sync retry scheduled
- receipt under review
- mapping awaiting approval
- token refresh pending

### Purpose
Reduce “what is happening?” anxiety.

---

## 3. Completed system actions
Show the user what the system or agent already handled successfully.

### Examples
- health check passed
- low-risk retry succeeded
- issue created automatically
- report generated
- export completed

### Purpose
Build trust through visible competence.

---

## Core screens

## Screen 1 — Operator Home / Today
This should become the primary landing page.

### It should answer immediately
- what is urgent?
- what is blocked?
- what is pending approval?
- what changed today?
- what did AI handle already?
- where am I at risk?

### Must-have sections
1. Needs attention
2. Pending approvals
3. Blocked workflows
4. Recent successful automations
5. System health summary
6. AI recommendations

### Design rules
- avoid raw table dumps as the first view
- every card should have a clear CTA
- status colors should be meaningful but restrained
- no information density that requires interpretation training

---

## Screen 2 — Approvals
This should be the control point for Tier 3 actions.

### Actions that belong here
- hold release
- inventory adjustments
- accounting export retries with financial impact
- mapping applications
- high-impact connector actions

### Each approval item should show
- exact proposed action
- why it is being proposed
- affected records/systems
- risk level
- who/what proposed it
- what changes if approved
- what happens if rejected

### Goal
Approval should feel informed and fast, not scary or ambiguous.

---

## Screen 3 — Blocked / Reconciliation Queue
This is where the product differentiates itself.

### Should include
- blocked accounting events
- missing mappings
- validation failures
- auth issues
- external sync errors
- stale failed retries

### Each blocked item should show
- what failed
- why it failed
- whether it is safe to retry
- recommended resolution
- whether AI is confident in the recommendation

### Goal
Make resolution feel guided, not forensic.

---

## Screen 4 — Inventory Exceptions
This is not general inventory browsing.
This is exception-focused inventory operation.

### Should highlight
- active holds
- low stock / abnormal deltas
- rejected or discrepant receipts
- recent adjustments
- lot-specific concerns

### Goal
Operators should be able to move from anomaly to action quickly.

---

## Screen 5 — Compliance Issues
This should focus on:
- what is open
- severity
- what caused the issue
- what needs to happen to close it

### Goal
Compliance should feel operational and resolvable, not bureaucratic.

---

## Screen 6 — Integrations / Accounting Health
This should focus on trust and visibility.

### Should show
- connection health
- auth status
- token freshness/health check status
- mapping completeness
- pending/blocked/exported counts
- reconciliation issues

### Goal
An operator should understand integration risk at a glance.

---

## AI assistance UX rules

### AI assistance should appear in three forms only
1. **Recommendation**
   - “best next action appears to be…”
2. **Draft**
   - pre-filled resolution or mapping proposal
3. **Explanation**
   - “this is blocked because…”

### AI should not appear as
- rambling chat everywhere
- freeform hidden reasoning
- unexplained autopilot behavior

### Every AI suggestion should show
- confidence / confidence band
- evidence used
- whether approval is required
- whether the recommendation is reversible

---

## Severity model
All exception surfaces should use a consistent severity model.

### Suggested levels
- **Critical** — immediate operational or financial risk
- **High** — must be resolved soon, likely blocks workflow
- **Medium** — important but not urgent
- **Low** — informational / cleanup / optimization

### Consistency rule
Severity should mean the same thing across:
- compliance
- inventory exceptions
- blocked exports
- approvals
- system health

---

## Trust indicators
The UI should explicitly show trust state when relevant.

### Examples
- Safe to retry
- Awaiting approval
- Mapping missing
- Connection unhealthy
- AI suggestion only
- Export confirmed
- Issue unresolved
- Low confidence

These indicators reduce operator guesswork.

---

## Recoverability UX
Every important action or failure state should expose:
- what happened
- how to recover
- whether retry is safe
- who needs to act
- what the system will do next if no one acts

This is essential for high-trust operation.

---

## What the UX must avoid

### Avoid
- leading with raw database tables
- ambiguous status language
- too many equal-priority cards
- hidden automation behavior
- approvals without exact diffs/impact explanation
- AI-generated “help” that adds noise instead of narrowing action
- screens that force technical model knowledge

### Why
The system is already complex.
The UX must absorb complexity, not expose it.

---

## What makes this product differentiated
The UX moat is not merely “good design.”
It is:
- exception-first operation
- trust-visible automation
- guided recoverability
- explainable AI assistance
- action-first resolution

This is how a serious system becomes usable.

---

## Immediate implementation priorities from this spec

### Priority 1
Build **Operator Home / Today** as the primary command surface.

### Priority 2
Build **Approvals** as a clean queue with risk-aware action cards.

### Priority 3
Build **Blocked / Reconciliation Queue** with recommended fixes and retry safety.

### Priority 4
Refactor inventory/compliance/integrations screens to emphasize:
- exceptions
- actions
- trust state
instead of general list browsing.

### Priority 5
Add a visible **Recent AI/System Actions** stream.

---

## Relationship to other docs
- `docs/architecture-overview.md` explains the system structure.
- `docs/ai-agent-access-trust-model.md` explains what agents may do.
- future portability and investor docs should rely on this UX model to explain how the product stays usable and trustworthy.

---

## Final summary
Onaply’s UX should make a complex system feel:
- understandable
- actionable
- bounded
- trustworthy

The operator should not have to think like an engineer to run it safely.
That is the standard this spec is setting.
