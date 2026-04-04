# Mainnet Readiness Audit — AGIJobManager + AGIJobDiscoveryPrime

Date: 2026-04-04
Scope: `agent/`, `core/`, `mission-control/`, legacy `AgiJobManager/`, legacy `AgiPrimeDiscovery/`.

## Executive Verdict

| Area | Verdict | Rationale |
|---|---|---|
| AGIJobManager applicant readiness | Partially ready | End-to-end applicant pipeline exists through unsigned packaging, but strong receipt/finality ingestion and unattended hardening are incomplete. |
| AGIJobManager validator readiness | Not ready | No active validator assignment/evidence/scoring/tx pipeline for AGIJobManager found in canonical runtime. |
| Prime applicant readiness | Partially ready | Prime monitoring + orchestration + tx handoff are substantial, but some transitions remain manual/heuristic and not fully receipt-driven. |
| Prime validator readiness | Not ready | Validator commit/reveal tx scaffolding exists, but payload generation and role wiring are not end-to-end implemented. |
| Unsigned transaction safety readiness | Partially ready | Unsigned doctrine and checks are strong in many paths, but enforcement is uneven across all Prime action types. |
| Restart/state-machine readiness | Partially ready | Atomic state + cursors + lock + recovery exist; deterministic replay safety is still incomplete for all failure classes. |
| Mission Control operator readiness | Partially ready | Useful observability exists, but it is mostly read/assist and not a complete supervised execution control plane. |

## Canonical Runtime Path vs Stale Paths

- **Canonical (active)**: `agent/*` orchestration and phase logic, with safety/shared utilities re-exported from `core/*`.
- **Operator UI path**: `mission-control/*` for read-side visibility and helper decoding.
- **Likely stale/legacy**: `AgiJobManager/*` and `AgiPrimeDiscovery/*` (historical direct-signing era; now disabled or contradictory to doctrine).

## AGIJobManager Applicant Audit

### Implemented
1. Discovery and enqueue (`discover.js`) using MCP list/get/spec reads with local state/artifacts.
2. Deterministic fit scoring (`evaluate.js` + `strategy.js`).
3. Unsigned apply bundle generation including `approve` + `apply` selector checks (`tx-builder.js`).
4. Assignment detection from remote job state (`confirm.js`).
5. Execution and artifact generation (`execute.js`) with structural output validation.
6. Completion metadata packaging, IPFS publication, unsigned completion tx package, and pre-sign checks/simulation (`submit.js`, `pre-sign-checks.js`).
7. Post-submission reconciliation polling (`reconcile-completion.js`).

### Partial / Risks
- Confirmation path is status-based and not universally tied to tx receipts/finality.
- Replay/idempotency controls are limited to coarse status transitions.
- Recovery for interrupted stages is simplistic (e.g., `working -> assigned`) and may not preserve full intent.

### Missing for production certainty
- Mandatory signed tx hash ingestion + finalized receipt binding per phase transition.
- Per-step idempotency tokens and duplicate-action suppression.
- Stronger deterministic acceptance criteria validation aligned to contract-legible requirements.

## AGIJobManager Validator Audit

### Findings
- Active AGIJobManager pipeline (`agent/orchestrator.js`) has no validator branch.
- No validator discovery/assignment/evidence/scoring/score-tx flow for AGIJobManager was found in canonical runtime.

### Verdict
- **Not implemented / not ready**.

## Prime Applicant Audit

### Implemented
1. Procurement discovery via `ProcurementCreated` scans with persisted block cursors (`prime-monitor.js`).
2. Deadline/phase derivation and next-action logic (`prime-phase-model.js`, `prime-next-action.js`).
3. Inspection artifacts and fit evaluation gating (`prime-inspector.js`, `prime-review-gates.js`, `prime/prime-evaluate.js`).
4. Commit/reveal/finalist/trial unsigned tx package builders and operator ready packets (`prime-tx-builder.js`, `prime/prime-orchestrator.js`).
5. Trial publication + fetch-back verification before trial tx handoff.
6. Winner evidence collection and reconciliation with finality depth helper (`prime-settlement.js`).

### Partial / Risks
- Some “submitted” confirmations rely on inferred app phase rather than explicit receipt capture.
- Reorg handling is limited; cursor rollback/reconciliation strategy is minimal.
- Multi-tx sequences (e.g., approval + finalist accept) remain operator-fragile.

### Missing for production certainty
- Uniform receipt/finality ingestion for every handoff action.
- Full replay-safe orchestration journal for cross-deadline recovery.
- Explicit escalation channel for deadline-critical windows.

## Prime Validator Audit

### Implemented
- Validator statuses exist in phase model.
- Unsigned tx builders for `scoreCommit` / `scoreReveal` exist.
- Orchestrator action branches exist for validator score phases.

### Critical gaps
- Orchestrator expects `state.validatorScoreCommitPayload` / `state.validatorScoreRevealPayload`; no canonical producer pipeline found.
- No deterministic validator scoring engine or evidence fetch path in active runtime.
- Prime tx validator selector policy for `scoreCommit` and `scoreReveal` is incomplete (empty allowlist sets).

### Verdict
- **Scaffolded, not operationally ready**.

## Safety & Signing Audit

### Enforced well
- Active architecture is unsigned-handoff oriented.
- Legacy AGIJobManager broadcast helpers hard-throw.
- Core tx validation + simulation pipeline exists for AGIJobManager completion path.

### Partial/missing enforcement
- Not all Prime action types have equivalent mandatory simulation + freshness gates.
- No universal CI/static guardrail shown that blocks signing primitives repo-wide.
- Legacy code carrying private-key assumptions still exists in deprecated folders.

## State / Persistence / Orchestration Audit

### Strengths
- Atomic JSON writes in both job and procurement state paths.
- Singleton lock mechanism in runner.
- Monitor cursors persisted and resumed.
- Explicit transition validation in Prime phase model.

### Weaknesses
- Recovery logic contains heuristics that can still require manual correction.
- Exactly-once semantics are not consistently guaranteed across multi-step workflows.
- Long unattended reliability remains below strict mainnet threshold.

## Mission Control Audit

### Useful today
- Prime contract read views.
- Next-action helper reads and decoded guidance cards.
- Event scan tooling and quick context for job/procurement IDs.

### Gaps
- Primarily observational; not a full execution control plane for signed tx lifecycle.
- Some action-code mappings are inferred, which can mislead at high-stakes edges if not kept synchronized with protocol truth.

## Top Mainnet Blockers (Priority)

1. Prime validator payload generation and role-wired scoring flow absent end-to-end.
2. AGIJobManager validator role pipeline absent in canonical runtime.
3. Incomplete selector-policy enforcement for Prime `scoreCommit`/`scoreReveal` validation.
4. Non-uniform mandatory simulation/freshness enforcement across all Prime tx packages.
5. Receipt/finality ingestion not uniformly required before status progression.
6. Reorg-resilient monitor cursor strategy incomplete.
7. Cross-phase replay/idempotency guarantees incomplete for unattended operation.
8. Mission Control lacks robust operator action lane for tx package lifecycle management.
9. Legacy path ambiguity (deprecated folders with conflicting assumptions) increases operational confusion risk.
10. Artifact integrity binding is strong in places but not uniformly anchored for every irreversible handoff.

## Build Plan

### Phase 1 — AGIJobManager applicant minimum
- Add required tx hash + receipt ingestion + finality checks for apply/completion handoffs.
- Add idempotency keys for each pipeline stage.
- Harden completion reconciliation with deterministic provenance.

### Phase 2 — Prime applicant minimum
- Make commit/reveal/finalist/trial/completion transitions receipt-driven.
- Enforce simulation + expiry checks for all Prime unsigned tx types.
- Add reorg-aware cursor reconciliation and rollback logic.

### Phase 3 — Prime validator minimum
- Implement validator role discovery and persistence.
- Implement deterministic scoring + payload artifact builder.
- Wire score commit/reveal progression with strict continuity checks.

### Phase 4 — Mainnet hardening
- CI guardrails to forbid signing/broadcast primitives in runtime code.
- Unified artifact-root hash binding in every ready packet.
- Chaos/restart tests for missed windows, delayed polling, and partial-state recovery.

## Bottom Line

- AGIJobManager apply reliability: **Partial**.
- AGIJobManager complete reliability: **Partial**.
- Prime applicant end-to-end reliability: **Partial**.
- Prime validator end-to-end reliability: **No**.
- Safe unattended mainnet operation under unsigned-only doctrine: **No-go today**; supervised human-in-loop operation is feasible with caution.
