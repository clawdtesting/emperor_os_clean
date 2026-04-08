1-line explanation for each .js script under agent/ (including subfolders):

agent/apply.js — Applies to a discovered job when strategy/evaluation says it should proceed.

agent/artifact-manager.js — Centralizes artifact directory/path creation and lookup for jobs/workspace outputs.

agent/build-brief.js — Builds the execution brief from normalized job/spec inputs for downstream work steps.

agent/config.js — Loads and validates environment/config values used across the agent runtime.

agent/confirm.js — Confirms assignment/progression state for jobs before later execution stages.

agent/discover.js — Fetches and filters available jobs/opportunities from MCP/market sources.

agent/evaluate.js — Runs fit/evaluation logic to decide whether a job should be pursued.

agent/execute.js — Executes the work phase using selected handlers/models and artifacts.

agent/ipfs-verify.js — Verifies IPFS-published artifacts via fetch-back/content checks for integrity.

agent/job-normalize.js — Normalizes raw job specs into consistent, contract-legible structure.

agent/llm-router.js — Routes jobs to the best available local model based on category/tags.

agent/lock.js — Provides lock acquisition to prevent concurrent/duplicate execution collisions.

agent/mcp.js — Wrapper client for MCP calls (list jobs, fetch job, fetch spec, etc.).

agent/notify.js — Sends operator notifications/checkpoints for important pipeline events.

agent/orchestrator.js — Main orchestrator cycle that sequences pipeline stages and versions.

agent/pre-sign-checks.js — Runs deterministic pre-sign validation before operator signing handoff.

agent/publish.js — Publishes deliverables/artifacts (e.g., IPFS) and records publication metadata.

agent/receipt-ingest.js — Ingests finalized on-chain receipts and records completion evidence/state.

agent/reconcile-completion.js — Reconciles completion outcomes against receipts/state/artifacts safely.

agent/recovery.js — Recovers interrupted runs from persisted state/artifacts after failures/restarts.

agent/rpc.js — RPC/provider helpers (including network assertions) for chain interactions.

agent/score.js — Deterministic job scoring (explicitly no LLM usage).

agent/signing-manifest.js — Builds signing manifests/checklists for operator review boundaries.

agent/simulation.js — Simulates unsigned transactions and captures decoded results for review safety.

agent/state-retention.js — Prunes/retains state files according to retention policy and limits.

agent/state.js — State utilities: IDs, paths, atomic reads/writes, and versioned job-state helpers.

agent/strategy.js — High-level strategy engine deciding apply/skip with explicit rationale.

agent/submit.js — Submits prepared job outputs/applications to upstream endpoint/contract interface.

agent/templates.js — Prompt/template helpers used by briefing/work-generation flows.

agent/tx-builder.js — Constructs unsigned transaction envelopes for operator signing.

agent/tx-reconcile.js — Fetches receipts and classifies tx outcomes for state reconciliation.

agent/tx-validator.js — Validates unsigned transaction package structure/content before handoff.

agent/validate.js — Validates generated work quality/structure/substance before publish/submit.

agent/work.js — Runs the job work step through the selected handler + LLM routing path.

Handlers (agent/handlers/)

agent/handlers/creative.js — Specialized handler for creative/writing-oriented jobs.

agent/handlers/default.js — Fallback handler when no specialized handler matches.

agent/handlers/development.js — Specialized handler for technical/development tasks.

agent/handlers/index.js — Router/selector that maps job type → appropriate handler module.

agent/handlers/research.js — Specialized handler for research/analysis-heavy tasks.

agent/handlers/writer.js — Writer-focused handler variant for writing-format outputs.

Prime procurement pipeline (agent/prime* and agent/prime/)

agent/prime-artifact-builder.js — Builds phase-specific Prime artifact bundles (inspection/reveal/finalist/etc.).

agent/prime-client.js — Prime contract/provider access layer for procurement/validator reads.

agent/prime-execution-bridge.js — Bridges selected Prime procurements into linked v1 job execution state.

agent/prime-inspector.js — Inspects procurements and writes structured inspection outputs/summaries.

agent/prime-monitor.js — Monitors procurements over time and reports actionable status windows.

agent/prime-next-action.js — Computes operator-facing next action from current Prime state + deadlines.

agent/prime-phase-model.js — Canonical Prime phase derivation, deadline math, and transition validity logic.

agent/prime-presign-checks.js — Deterministic pre-sign checks specific to Prime transaction packages.

agent/prime-receipts.js — Ingests operator-submitted Prime tx receipts after finalization windows.

agent/prime-retrieval.js — Archive retrieval/packet extraction utilities for Prime execution quality.

agent/prime-review-gates.js — Enforces review gates at commit/reveal/finalist/trial/completion boundaries.

agent/prime-settlement.js — Settlement/finality reconciliation utilities for winner/completion evidence.

agent/prime-state.js — Prime state/artifact filesystem model and atomic persistence helpers.

agent/prime-tx-builder.js — Builds unsigned Prime tx packages (commit, reveal, finalist accept, trial, etc.).

agent/prime-tx-validator.js — Validates Prime unsigned tx package correctness before operator review.

agent/prime-validator-engine.js — Validator scoring commitments/reveal verification and assignment scoring payloads.

agent/prime/prime-content.js — Generates Prime markdown content and handles IPFS publish/fetchback verification.

agent/prime/prime-evaluate.js — Deterministic fit evaluator for Prime procurements.

agent/prime/prime-first-job.js — Dry-run helper for first procurement flow/setup validation.

agent/prime/prime-orchestrator.js — End-to-end Prime phase orchestrator with recovery and cycle control.

v1 compatibility layer (agent/v1/)

agent/v1/AgiJobManager-v1.js — v1 orchestrator entrypoint and pipeline mapping for AGIJobManager v1.

agent/v1/build-brief.js — v1-compatible re-export/shim for brief building logic.

agent/v1/config.js — v1-compatible re-export/shim for config logic.

agent/v1/ipfs-verify.js — v1-compatible re-export/shim for IPFS verification logic.

agent/v1/job-normalize.js — v1-compatible re-export/shim for job normalization logic.

agent/v1/pre-sign-checks.js — v1-compatible re-export/shim for pre-sign checks logic.

agent/v1/signing-manifest.js — v1-compatible re-export/shim for signing manifest logic.

agent/v1/templates.js — v1-compatible re-export/shim for templates logic.

agent/v1/tx-builder.js — v1-compatible re-export/shim for tx-builder logic.


