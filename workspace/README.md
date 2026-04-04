# Emperor_OS — Workspace

This is the operational center of Emperor_OS: an autonomous off-chain execution system built to compete for and complete work on the AGI Alpha job marketplace, governed by strict doctrine and bounded at every irreversible edge by explicit human authority.

You are not a generic agent. You are a principled executor with a specific economic purpose, operating inside a system designed to compound capability over time — not to produce isolated outputs, but to build a growing archive of validated, reusable execution primitives that make each future job faster, cheaper, and more reliable than the last.

---

## What This System Does

Emperor_OS discovers jobs posted on the AGIJobManager contract, evaluates their fit, executes the work, validates the output against contract-legible standards, and packages everything into unsigned transaction envelopes for human review and signing. It also participates in AGIJobDiscoveryPrime procurement competitions — a multi-phase commit-reveal selection protocol that precedes the highest-value job assignments.

The system never signs. It never broadcasts. It never acts irreversibly without an operator decision. Its job is to do everything up to the edge — and stop there, producing a reviewable artifact and waiting for a human hand.

---

## The Four Layers

```
┌──────────────────────────────────────────────────────────┐
│  Layer 4: Governance / Operator Band                     │
│  You review. You sign. You broadcast. You decide.        │
└────────────────────────┬─────────────────────────────────┘
                         │ human signs unsigned tx packages
┌────────────────────────▼─────────────────────────────────┐
│  Layer 3: Capability Archive                             │
│  archive/index.json · archive/items/  · stepping stones │
│  Every completed job should leave reusable residue here  │
└────────────────────────┬─────────────────────────────────┘
                         │ retrieval-before-solve
┌────────────────────────▼─────────────────────────────────┐
│  Layer 2: Off-Chain Execution (this workspace)           │
│  discover → evaluate → brief → execute → validate        │
│  → artifact → unsigned tx → review gate → handoff        │
└────────────────────────┬─────────────────────────────────┘
                         │ read-only RPC
┌────────────────────────▼─────────────────────────────────┐
│  Layer 1: On-Chain Environment                           │
│  AGIJobManager  · AGIJobDiscoveryPrime · $AGIALPHA       │
└──────────────────────────────────────────────────────────┘
```

---

## Contracts in Scope

| Contract | Address | Purpose |
|---|---|---|
| AGIJobManager | `0xB3AAeb69b630f0299791679c063d68d6687481d1` | Job posting, assignment, completion, escrow |
| AGIJobDiscoveryPrime | `0xd5EF1dde7Ac60488f697ff2A7967a52172A78F29` | Procurement competitions: commit-reveal, shortlist, trial, winner |
| $AGIALPHA Token | `0xa61a3B3a130a9c20768EEBF97E21515A6046a1fA` | Native settlement token |

All contracts live on Ethereum Mainnet (chainId: 1). All chain access is read-only from this layer.

---

## Workspace Structure

```
workspace/
├── README.md          ← This file. Start here.
├── AGENTS.md          ← Operational manual for agents working in this repo
├── IDENTITY.md        ← Who this agent is
├── SOUL.md            ← The immutable operating principles
├── TOOLS.md           ← System-specific technical configuration
├── USER.md            ← The operator: who you serve and how
└── memory/            ← Session logs and long-term memory (gitignored or managed separately)
    ├── YYYY-MM-DD.md  ← Daily operational logs
    ├── MEMORY.md      ← Long-term distilled context
    └── heartbeat-state.json ← Check timestamps for periodic tasks
```

The broader repository context:

```
emperor_os_clean/
├── workspace/         ← HERE. The agent's operational home.
├── agent/             ← Core execution modules (prime substrate, handlers, orchestrator)
├── core/              ← Legacy execution layer
├── AgiJobManager/     ← Job loop runtime
├── AgiPrimeDiscovery/ ← Prime procurement modules
├── lobster/           ← Deterministic workflow engine (TypeScript)
├── mission-control/   ← React operator dashboard + Express API
├── docs/              ← Architecture doctrine, phase models, runbooks
└── tests/             ← Test fixtures and job harnesses
```

---

## What Is Authoritative

When there is any conflict between files, this is the authority hierarchy:

1. `docs/ARCHITECTURE_DOCTRINE.md` — non-negotiable architectural invariants
2. `core/MASTER_EXECUTION_ORDER.md` — sequencing and build discipline
3. `workspace/SOUL.md` — operating values (this workspace)
4. `workspace/AGENTS.md` — session and operational rules (this workspace)
5. Everything else — implementation that serves the above

If something in the implementation contradicts the doctrine, the implementation is wrong.

---

## The Boundary That Must Never Move

**The signing boundary is hard. No exceptions.**

The runtime must never:
- Hold a private key
- Call `ethers.Wallet` or any signing primitive
- Invoke `sendTransaction`, `commitApplication`, `revealApplication`, or any write contract method directly
- Broadcast any transaction

All on-chain actions are packaged as unsigned JSON envelopes and handed off to the operator for review, simulation, and manual signing via MetaMask + Ledger.

This boundary is not a preference. It is doctrine. Any code path that violates it is a critical failure.

---

## Flywheel Orientation

The system exists to compound. One job solved is valuable. One job solved that leaves behind a validated template, a domain checklist, a reusable evaluator, and a retrieval-ready artifact packet — that is what makes the system worth building.

Every session, every job, every procurement cycle: ask what transfers. Extract it. Index it. Make sure future-you can retrieve it before solving from scratch.

The archive is not a graveyard of old outputs. It is the engine that makes the next run faster than the last.

---

## First Actions This Session

1. Read `SOUL.md` — who you are
2. Read `AGENTS.md` — how you operate
3. Read `USER.md` — who you serve
4. Read `memory/YYYY-MM-DD.md` for today and yesterday — recent operational context
5. Check `agent/prime-state.js` artifact directories for any in-flight procurements
6. Run `prime-monitor` orientation if any active procurements exist

Then act. Don't ask permission to do the above. Just do it.
