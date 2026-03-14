# Onaply Cloud Portability & Readiness Specification

_Last updated: 2026-03-13 22:59 CT_
_Status: Draft v1_

## Purpose
Define how Onaply should be structured so it can:
- run well locally during active build
- move cleanly into cloud infrastructure later
- expand without being trapped by local-machine assumptions
- preserve security, reliability, and operator trust during that transition

This spec exists to stop portability from being an aspiration and turn it into a concrete design constraint.

---

## Core portability thesis
Onaply should be built so that deployment location is an implementation detail, not a product rewrite.

That means the system should remain coherent across:
- local development
- single-node hosted deployment
- cloud-managed deployment
- future multi-tenant expansion

Portability is not just about “using Postgres.”
It is about making sure the whole system can move without hidden coupling.

---

## Portability goals

### 1. Environment portability
The app should be able to move between environments without changing domain behavior.

### 2. Secret portability
Credentials and tokens should not be trapped in local-only files or brittle ad hoc storage patterns.

### 3. Runtime portability
Background work, connectors, and health checks should not depend on one specific machine setup forever.

### 4. Data portability
Core data should remain in durable, exportable, migration-friendly stores.

### 5. Operational portability
Backups, restores, monitoring, and deployment flow should remain possible outside a single laptop/Mac mini context.

---

## Current known state

### Strengths already present
- Postgres-backed domain model
- Prisma migration discipline improving
- provider-neutral connector architecture
- worker/outbox direction exists
- backup discipline exists
- accounting bridge is not locked to one external tool

### Weaknesses currently present
- environment configuration is still spread across multiple `.env` locations
- some service assumptions remain local-machine-oriented
- token/secret handling is still acceptable-for-build, not final production-grade
- backup flow currently uses a subtree workaround instead of a fully clean dedicated remote target
- deployment portability is directionally supported, but not yet explicitly standardized

---

## Non-negotiable portability principles

### 1. Product logic must not depend on machine-specific paths
Core behavior should not rely on:
- local file system layout assumptions
- one specific user home directory
- hardcoded workstation-only locations

### 2. Secret storage must be abstractable
The system must be able to move from:
- local env secrets
into:
- encrypted secret stores
- managed cloud secret systems
- vault-style secret references
without rewriting product behavior

### 3. Connector logic must remain isolated
External-system integrations must stay inside connector/adapter boundaries so cloud movement does not require domain rewrites.

### 4. Worker execution must be separable
Async/background work should be able to run:
- in-process during local development
- as a separate worker in hosted/cloud deployments

### 5. Backups must be off-machine and understandable
Recovery should not depend on local-only state or one person remembering where things are.

---

## Target deployment model progression

## Stage 1 — Local build mode
Purpose:
- fast iteration
- schema evolution
- workflow prototyping
- operator UX shaping

Characteristics:
- local app server
- local env files
- local worker behavior acceptable
- app-backed remote code backup required
- build discipline still enforced

## Stage 2 — Cloud single-tenant hosted mode
Purpose:
- real-world usage
- operational reliability
- shared access
- external connector uptime beyond one machine

Characteristics:
- hosted app runtime
- managed Postgres
- managed Redis/queue layer if needed
- hosted worker process
- managed secrets
- app-level health and backup visibility

## Stage 3 — Cloud multi-tenant expansion mode
Purpose:
- scale product beyond one primary operating company
- stronger isolation and policy boundaries

Characteristics:
- tenant-aware auth
- stronger secret segmentation
- connector isolation per tenant
- stricter worker concurrency controls
- more formal observability and compliance posture

---

## Required boundaries for portability

## Boundary 1 — App runtime
The web application should remain stateless aside from:
- session/auth integration
- database access
- queue invocation

### Rule
Do not hide important durable state in local app memory or local-only files.

---

## Boundary 2 — Data runtime
Core durable data belongs in managed, portable stores.

### Today
- Postgres is the right center of gravity

### Rule
Do not move critical business truth into:
- local JSON files
- process memory
- hidden background state that cannot be restored

---

## Boundary 3 — Worker runtime
Workers should be able to run outside the web process.

### Rule
Any workflow that matters to reliability should be movable into:
- a queue/worker process
- a scheduled job runtime
- a cloud worker/container later

---

## Boundary 4 — Connector runtime
Integrations should operate as adapter units that can be hosted, retried, and monitored independently of the main UI.

### Rule
Do not couple connector behavior tightly to request/response UI execution.

---

## Boundary 5 — Secret runtime
Secrets must become externalizable.

### Build mode acceptable today
- env files
- encrypted metadata blobs where needed

### Target state
- managed secret store or secret-reference layer
- minimal raw secret exposure in app state
- strong separation between secret values and user-facing metadata

---

## Environment standardization rules

## Rule 1
The workspace root env should act as the canonical orchestration env for shared infra services like deep search.

## Rule 2
App-specific env files should be clearly defined and minimized.

## Rule 3
If a credential is required by a global protocol, it must live in the global env or be intentionally bridged there.

## Rule 4
Do not allow “the key exists somewhere in a random app env” to count as working configuration.

---

## Secret handling roadmap

## Current acceptable state
- env-based during active build
- encrypted token blobs for QuickBooks as an intermediate step

## Required next state
- move toward secret references
- separate metadata from secret values
- support token refresh without exposing raw secrets in user-facing contexts
- document secret rotation paths

## Long-term target
- cloud secret manager / vault-backed pattern
- least-privilege runtime access
- auditable secret update workflows

---

## Data portability requirements

### Must be true
- schema changes happen through migrations
- core data can be restored from backups
- key business entities remain exportable
- connector state can be reconstructed or safely re-linked
- audit and reconciliation trails persist across environments

### Immediate requirement
Avoid hidden operational truth that only exists in ephemeral runtime or workstation state.

---

## Backup & recovery requirements

## Code
- meaningful milestones committed locally
- important checkpoints pushed off-machine
- Onaply subtree backup acceptable as current state
- long-term target is a cleaner dedicated remote/repo structure

## Data
Need a clearer policy for:
- database snapshot cadence
- restore procedure
- connector state restore
- migration recovery testing

## Docs
Need visible recovery guidance for:
- latest safe checkpoint
- restore path
- current architecture state
- latest known good build state

---

## Observability requirements for cloud readiness
Before serious hosting expansion, the system should expose:
- health check status
- worker state
- connector health
- blocked event counts
- reconciliation issue counts
- auth/credential health summary
- recent critical failures

Cloud portability is not just deployment. It is diagnosability outside the original machine.

---

## Security implications of portability
A cloud-portable system must be more explicit about security than a local build.

### Required properties
- tenant isolation
- secret isolation
- approval boundaries
- auditability
- bounded agent access
- connector-scoped permissions
- safe retry/recovery behavior

### Rule
Do not expand cloud reach faster than the trust and policy boundaries are documented and enforced.

---

## Immediate implementation priorities from this spec

### Priority 1
Document and standardize env ownership.
- what belongs in workspace `.env`
- what belongs in app `.env`
- what must be bridged globally

### Priority 2
Move toward a cleaner secret model for connectors.
- preserve encrypted token path for now
- define next step toward secret references

### Priority 3
Make worker boundaries more explicit.
- identify what can/should leave request path entirely
- identify what should eventually live in a dedicated worker runtime

### Priority 4
Strengthen backup/recovery documentation.
- code checkpointing
- data restore expectations
- latest known good state visibility

### Priority 5
Create a future deployment outline.
- local
- hosted single-tenant
- cloud expansion

---

## What this spec should prevent
This spec should prevent Onaply from becoming:
- a workstation-bound system
- a secret-management mess
- a local-success / cloud-failure product
- a connector tangle that cannot scale
- a product whose reliability depends on one machine staying alive forever

---

## Relationship to other docs
- `docs/architecture-overview.md` explains the whole system shape
- `docs/ai-agent-access-trust-model.md` defines safe agent boundaries
- `docs/exception-first-ux-spec.md` explains how complexity becomes usable
- future investor and deployment docs should use this spec to explain why the system can scale responsibly

---

## Final summary
Onaply should be built so it can move from local to cloud without losing:
- trust
- clarity
- reliability
- connector flexibility
- operator safety

Portability is not a future cleanup project.
It is a current architecture constraint.
