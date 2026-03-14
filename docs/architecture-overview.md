# Onaply Architecture Overview

_Last updated: 2026-03-13 22:58 CT_
_Status: Draft v1_

## Purpose
This document explains the Onaply system in a way that is understandable to:
- operators
- collaborators
- technical reviewers
- future investors
- future acquirers or diligence teams

It is meant to answer:
- what the product is
- how it is structured
- why it is built this way
- how it stays trustworthy as automation and AI-agent access increase

---

## One-line system description
Onaply is a reliability-first operational system that makes complex workflows easier to run, easier to trust, and easier to automate safely.

---

## What problem Onaply solves
Businesses running operational workflows across inventory, receiving, compliance, accounting, and automation often end up with systems that are:
- fragmented across tools
- hard to trust
- difficult to automate safely
- fragile when errors happen
- dependent on manual workarounds and human memory

Onaply is being built to solve this by providing:
- operational truth
- bounded automation
- explainable actions
- exception-first workflows
- portable integrations

---

## Core product promise
Onaply should make an extremely complex system feel:
- simpler to operate
- safer to automate
- easier to understand
- easier to recover when things go wrong

The goal is not just automation.
The goal is **operator trust under complexity**.

---

## Architectural principles

### 1. Onaply is the operational system of record
Operational truth should live in Onaply, not in external tools.

That includes core facts about:
- receipts
- inventory state
- holds/releases
- adjustments
- compliance issues
- accounting event intent

### 2. External systems are connectors, not the core model
QuickBooks and future tools should be treated as:
- targets
- adapters
- sync destinations
- ecosystem participants

They must not define the internal domain model.

### 3. Every high-risk change should be traceable
Inventory, accounting, compliance, and connector actions should be:
- auditable
- attributable
- explainable
- recoverable when possible

### 4. Exceptions are first-class
Blocked states, reconciliation, approvals, and issue resolution are not side cases.
They are core product surfaces.

### 5. AI power must be bounded by trust policy
Agent access should expand only within explicit trust tiers.

---

## System layers

## Layer 1 — Operator layer
This is the human-facing product experience.

### Responsibilities
- show what needs attention now
- simplify complex workflows into guided actions
- surface blocked states and next steps
- expose recent AI/system actions clearly
- collect approvals where needed

### Product direction
The UI should be:
- task-first
- exception-first
- clear under pressure
- low-ambiguity

Not schema-first.

---

## Layer 2 — Operational domain layer
This is the business logic core.

### Domains currently represented
- suppliers
- items
- purchase orders / purchasing
- receipts / receiving
- inventory balances
- inventory holds
- inventory adjustments
- compliance issues

### Responsibilities
- enforce business rules
- preserve operational truth
- maintain consistent state transitions
- generate auditable events

This is where the trust of the system starts.

---

## Layer 3 — Accounting bridge layer
This is the provider-neutral integration boundary for accounting systems.

### Key concepts
- IntegrationConnection
- AccountingMapping
- AccountingEvent
- AccountingExportAttempt
- AccountingReconciliationIssue

### Responsibilities
- represent connection state
- store mapping references
- emit provider-neutral accounting events
- track export attempts
- manage blocked and failed sync situations
- enable future connectors beyond QuickBooks

### Why this matters
This keeps Onaply from becoming:
- QuickBooks-shaped
- tightly coupled to one external system
- hard to port later

---

## Layer 4 — Connector / adapter layer
This is where external tools are translated to and from the internal model.

### Current direction
- QuickBooks is connector #1
- future connectors can follow the same contract

### Responsibilities
- auth / token lifecycle
- payload translation
- provider-specific validation handling
- external ref persistence
- retry / health-check behavior

### Rule
Connector logic should not redefine operational truth.
It should translate and synchronize against it.

---

## Layer 5 — Worker / automation layer
This is the background execution layer.

### Responsibilities
- process accounting events
- retry safe jobs
- run health checks
- generate low-risk system maintenance tasks
- create reconciliation issues when required

### Design rule
High-risk side effects should happen through bounded asynchronous workflows, not directly in request paths.

---

## Layer 6 — AI agent policy layer
This governs how AI agents interact with the system.

### Purpose
Allow as much useful AI-agent leverage as possible without creating security breaches, silent financial damage, or operator distrust.

### Governing artifact
- `docs/ai-agent-access-trust-model.md`

### High-level policy
- some actions are read-only
- some are draft-only
- some require approval
- some may be bounded-autonomous
- some are forbidden

---

## Trust-critical flows

## Inventory control loop
Key idea:
- balances are derived from movements and governed transitions, not casual mutation

Important operations:
- receiving
- hold creation
- hold release
- adjustment posting
- audit recording

## Compliance loop
Key idea:
- important exceptions become explicit issues, not hidden footnotes

Important operations:
- issue generation
- issue review
- issue resolution
- future escalation/approval flows

## Accounting loop
Key idea:
- internal events first, connector translation second

Important operations:
- accounting event generation
- mapping validation
- blocked state handling
- export attempt tracking
- reconciliation resolution

---

## Current major capabilities already in place
- inventory trust baseline
- hold/release flow
- inventory adjustments
- lot detail/operator inventory UI
- compliance issue model and review surfaces
- provider-neutral accounting bridge foundation
- blocked/reconciliation accounting hardening
- QuickBooks OAuth start/callback
- QuickBooks token refresh and health checks
- deep-search/memory/search hardening supporting the build process itself

---

## Current known gaps
These are the main gaps preventing the architecture from being fully realized.

### 1. Exception-first UX is not fully implemented yet
The backend direction is strong, but the operator-facing trust surface is still incomplete.

### 2. Mapping management UI/actions still need to be built
Without this, the accounting bridge remains partially theoretical.

### 3. Reconciliation resolution flow still needs to mature
Issues can be surfaced, but they still need a cleaner operator recovery path.

### 4. Secret handling needs stronger long-term posture
Current token handling is acceptable for active build mode, but should be hardened for long-term production/cloud use.

### 5. Cloud portability still needs a dedicated readiness spec
The current direction supports portability, but the portability model needs to be documented and enforced explicitly.

---

## Why this architecture is defensible
Onaply’s likely defensibility is not just feature count.
It is the combination of:
- trust architecture
- exception handling
- explainability
- bounded AI-agent access
- connector portability
- operational depth in painful workflows

Many products can automate a happy path.
Fewer can make complex operations:
- auditable
- safe
- recoverable
- easy to trust

That is the real strategic advantage.

---

## Why this architecture is investor-relevant
An investor or strategic buyer should be able to see:
- a real wedge
- a coherent technical model
- evidence of disciplined execution
- a credible path to scale
- a product that can become harder to copy over time

This architecture supports that because it is being built around:
- systems of record
- policy and boundaries
- connector abstraction
- operator trust
- portability

---

## How this should evolve next
The next major architecture artifacts and implementations should be:

1. exception-first UX spec
2. cloud portability readiness spec
3. investor technical overview
4. mapping UI/actions
5. reconciliation resolution flow
6. safe automation ladder implementation

---

## Final summary
Onaply is being built as a reliability-first operating system for complex workflows.

The system should become:
- easy enough for operators to trust
- strict enough for businesses to rely on
- flexible enough to integrate widely
- portable enough to migrate and scale
- bounded enough to use AI agents safely

That is the architecture we should protect as the company grows.
