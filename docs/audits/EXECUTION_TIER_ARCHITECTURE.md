EXECUTION_TIER_ARCHITECTURE.md
# EMPEROR_OS — EXECUTION TIER ARCHITECTURE (MASTER SPEC)

## PURPOSE

Define how Emperor_OS:
- selects execution tiers
- decides whether to apply to jobs
- executes jobs safely and profitably
- scales from simple to complex tasks

This document is the **single source of truth** for:
- execution tiers
- tier selection logic
- apply gate logic
- economic constraints
- runtime escalation

---

# 1. CORE PRINCIPLE

> Always select the **lowest-cost execution tier that can successfully complete the job**.

Never:
- over-upgrade tier unnecessarily
- under-execute complex jobs
- accept jobs that cannot be completed correctly

---

# 2. ARCHITECTURE OVERVIEW

The system is divided into **two independent axes**:

## 2.1 Protocol Layer (WHERE the job lives)

- `AGIJobManager` (direct jobs)
- `AGIPrime` (procurement lifecycle)

This defines:
- contract rules
- lifecycle
- allowed execution tiers

---

## 2.2 Execution Layer (HOW the job is executed)

Execution is defined by tiers:

### T1 — ONE_SHOT
- max 1 model call
- deterministic pipeline
- no iteration

### T2 — REPAIR_LOOP
- 2–3 model calls max
- draft → validate → repair → validate
- validator-driven

### T3 — PLANNER_EXECUTOR
- multi-stage execution
- plan → execute subtasks → finalize
- bounded decomposition

### T4 — ORCHESTRATED (future)
- tool-heavy workflows
- retrieval + execution + validation loops
- still bounded

---

# 3. PROTOCOL POLICY (HARD LIMITS)

Each contract defines allowed tiers:

Example:

```json
{
  "AGIJobManager:v1": {
    "allowedExecutionTiers": ["T1_ONE_SHOT", "T2_REPAIR_LOOP"]
  },
  "AGIPrime:v1": {
    "allowedExecutionTiers": ["T1_ONE_SHOT", "T2_REPAIR_LOOP", "T3_PLANNER_EXECUTOR"]
  }
}

Rule:

NEVER use a tier not allowed by protocol
4. JOB CLASSIFICATION

Before execution, each job MUST be classified.

4.1 Features extracted
{
  "deliverableCount": number,
  "crossArtifactDependencies": boolean,
  "ambiguityScore": 0-10,
  "externalToolsRequired": number,
  "validationAvailable": boolean,
  "iterationRisk": 0-10
}
4.2 Archetype classification

Examples:

simple_content
structured_research
code_generation
multi_file_build
procurement_application
procurement_trial

Each archetype has a default tier.

5. EXECUTION TIER SELECTION
5.1 Selection algorithm
Get allowed tiers from protocol
Classify job
Score complexity
Evaluate tiers from lowest → highest
Select first tier that satisfies constraints
5.2 Tier rules
T1_ONE_SHOT

Use if:

deliverableCount == 1
ambiguity ≤ 3
externalToolsRequired == 0
iterationRisk ≤ 3
T2_REPAIR_LOOP

Use if:

deliverableCount ≤ 3
validationAvailable == true
iterationRisk ≤ 7
no major decomposition required
T3_PLANNER_EXECUTOR

Use if:

multiple dependent outputs
crossArtifactDependencies == true
ambiguity ≥ 7
externalToolsRequired ≥ 2
6. APPLY GATE (CRITICAL)

DO NOT AUTO-APPLY WITHOUT PASSING THIS.

6.1 Decision function
function shouldApply(job) {
  const tier = selectExecutionTier(job);
  const cost = estimateExecutionCost(job, tier);
  const payout = estimateUsdValue(job.payout);

  if (!tier.allowed) return false;
  if (!cost.withinBudget) return false;
  if (!payoutCovers(cost, 0.25)) return false;
  if (!validationFeasible(job, tier)) return false;
  if (!confidenceAboveThreshold(job, tier)) return false;

  return true;
}
6.2 Required checks
Execution feasibility
Can job succeed under allowed tiers?
Economic viability
payout >= cost * 1.25
Validation feasibility
Can output be verified?
Complexity fit
Tier must match job complexity
Ambiguity risk
Reject high ambiguity jobs without clarification path
7. COST ESTIMATION

Estimate:

{
  "modelCalls": number,
  "tokens": number,
  "usdCost": number,
  "wallClockTime": seconds
}

Then compare with:

{
  "payoutUsd": number,
  "requiredMargin": 0.25
}
8. RUNTIME ESCALATION

Escalation is allowed ONLY if:

next tier is allowed by protocol
budget remains
failure is repairable
maxEscalations not exceeded
8.1 Escalation policy
{
  "enabled": true,
  "maxEscalations": 1,
  "allowedPaths": [
    ["T1_ONE_SHOT", "T2_REPAIR_LOOP"],
    ["T2_REPAIR_LOOP", "T3_PLANNER_EXECUTOR"]
  ]
}
9. STATE MACHINE

New execution flow:

discover
→ normalize
→ classify
→ tier_selection
→ economic_check
→ apply_decision

IF approved:
  → apply
  → execute_pass_1
  → validate

IF failed AND repairable:
  → repair_pass
  → validate

IF complete:
  → finalize
  → submit
10. ARTIFACTS (MANDATORY)

Each job MUST produce:

10.1 Tier selection artifact

artifacts/job_<id>/tier_selection.json

Contains:

selected tier
reasoning
complexity features
economic check
10.2 Execution tracking
pass_1/
pass_2/
validation.json
repair_logs.json
11. ECONOMIC POLICY

Jobs must be profitable.

Rule:

payout_usd >= execution_cost_usd * 1.25

Otherwise:

DO NOT APPLY
12. DESIGN PRINCIPLES
Start simple, escalate only when needed
Deterministic pipelines preferred for reliability
Always validate outputs
Never allow uncontrolled loops
Maintain full auditability
13. NON-NEGOTIABLE CONSTRAINTS
NEVER more than allowed model calls
NEVER exceed token budget
NEVER sign transactions automatically
ALWAYS persist state
ALWAYS produce artifacts
ALWAYS validate before submission
14. FINAL RULE

Emperor_OS is NOT a job collector.
It is a selective execution system.

Only execute jobs that are:

feasible
profitable
verifiable