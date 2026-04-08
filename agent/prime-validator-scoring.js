// agent/prime-validator-scoring.js
// Orchestrates the validator scoring pipeline end-to-end:
//   1. Gather evidence from procurement artifacts
//   2. Run multi-dimensional adjudication
//   3. Generate deterministic salt
//   4. Build score commit and reveal handoff packages
//   5. Assert review gates before state transitions
//
// SAFETY CONTRACT: No signing. No broadcasting. Produces unsigned tx files only.

import { createHash } from "crypto";
import path from "path";
import {
  readJson,
  writeJson,
  procRootDir,
  procSubdir,
  ensureProcSubdir,
  getProcState,
  transitionProcStatus,
} from "./prime-state.js";
import {
  discoverValidatorAssignment,
  computeScoreCommitment,
  verifyScoreRevealAgainstCommit,
} from "./prime-validator-engine.js";
import { adjudicateScore } from "../validation/scoring-adjudicator.js";
import {
  buildValidatorScoreCommitHandoff,
  buildValidatorScoreRevealHandoff,
} from "../validation/score-tx-handoff.js";
import {
  assertValidatorScoreCommitGate,
  assertValidatorScoreRevealGate,
} from "./prime-review-gates.js";
import { PROC_STATUS } from "./prime-phase-model.js";
import { CONFIG } from "./config.js";

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function deterministicSalt(procurementId, score, input) {
  const h = createHash("sha256")
    .update(`${procurementId}:${score}:${stableStringify(input)}`, "utf8")
    .digest("hex");
  return `0x${h}`;
}

async function gatherEvidence(procurementId) {
  const procRoot = procRootDir(procurementId);
  const chainSnapshot = await readJson(path.join(procRoot, "chain_snapshot.json"), null);
  const trialManifest = await readJson(path.join(procSubdir(procurementId, "trial"), "trial_artifact_manifest.json"), null);
  const trialContent = await readTrialContent(procurementId);

  const procurement = chainSnapshot?.procurement ?? {};
  const deadlines = {
    trial: Number(procurement.trialDeadline ?? 0),
    scoreCommit: Number(procurement.scoreCommitDeadline ?? 0),
    scoreReveal: Number(procurement.scoreRevealDeadline ?? 0),
  };

  const evidence = {
    schema: "emperor-os/validator-evidence/v1",
    procurementId: String(procurementId),
    procurement: {
      procStruct: procurement,
      deadlines,
      chainPhase: chainSnapshot?.chainPhase ?? null,
      isScorePhase: ["SCORE_COMMIT", "SCORE_REVEAL"].includes(chainSnapshot?.chainPhase),
    },
    trial: {
      trialManifest,
      trialSubmissions: trialContent
        ? [{ content: trialContent, contentLength: trialContent.length, cid: trialManifest?.trialUri ?? null, trialURI: trialManifest?.trialUri ?? null }]
        : [],
    },
    gatheredAt: new Date().toISOString(),
  };

  return { evidence, trialContent };
}

async function readTrialContent(procurementId) {
  const trialDir = procSubdir(procurementId, "trial");
  const candidates = ["trial_deliverable.md", "trial_content.md", "trial.md"];
  for (const name of candidates) {
    try {
      const { promises: fs } = await import("fs");
      return await fs.readFile(path.join(trialDir, name), "utf8");
    } catch { /* next candidate */ }
  }
  // Try loading from manifest
  const manifest = await readJson(path.join(trialDir, "trial_artifact_manifest.json"), null);
  if (manifest?.content) return manifest.content;
  return null;
}

/**
 * Run the full validator score-commit pipeline for a procurement.
 * Produces: evidence_bundle.json, adjudication_result.json, score_commit_payload.json,
 *           unsigned_score_commit_tx.json
 */
export async function runValidatorScoreCommit({ procurementId, validatorAddress }) {
  const scoringDir = await ensureProcSubdir(procurementId, "scoring");

  // 1. Discover validator assignment
  const assignment = await discoverValidatorAssignment(procurementId, validatorAddress);
  if (!assignment.assigned) {
    console.log(`[validator-scoring] not assigned as validator for procurement #${procurementId}`);
    return null;
  }

  // 2. Gather evidence
  const { evidence, trialContent } = await gatherEvidence(procurementId);
  await writeJson(path.join(scoringDir, "evidence_bundle.json"), evidence);

  // 3. Run adjudication
  const adjudication = adjudicateScore(evidence, trialContent);
  await writeJson(path.join(scoringDir, "adjudication_result.json"), adjudication);

  // 4. Generate deterministic salt
  const score = Math.round(adjudication.score);
  const adjInput = {
    procurementId: String(procurementId),
    validatorAddress: String(validatorAddress).toLowerCase(),
    evidence,
  };
  const salt = deterministicSalt(procurementId, score, adjInput);

  // 5. Build handoff package
  const handoff = await buildValidatorScoreCommitHandoff({
    procurementId,
    score,
    salt,
    adjudication,
  });

  // 6. Assert gate
  const state = await getProcState(procurementId);
  await assertValidatorScoreCommitGate({ procurementId, procState: state });

  // 7. Transition state
  await transitionProcStatus(procurementId, PROC_STATUS.VALIDATOR_SCORE_COMMIT_READY, {
    validatorRole: true,
    validatorScore: score,
    validatorScoreCommitment: handoff.payload.scoreCommitment,
    scoringDir,
  });

  console.log(`[validator-scoring] score commit ready for procurement #${procurementId} (score=${score})`);
  return handoff;
}

/**
 * Run the full validator score-reveal pipeline for a procurement.
 * Reads prior commit payload, verifies continuity, produces reveal handoff.
 */
export async function runValidatorScoreReveal({ procurementId, validatorAddress }) {
  const scoringDir = procSubdir(procurementId, "scoring");

  // 1. Load prior commit payload
  const commitPayload = await readJson(path.join(scoringDir, "score_commit_payload.json"), null);
  if (!commitPayload) {
    throw new Error(`No score_commit_payload.json found for procurement #${procurementId}`);
  }

  const { score, salt, scoreCommitment } = commitPayload;

  // 2. Continuity guard: verify reveal matches commit
  const continuity = verifyScoreRevealAgainstCommit({
    score,
    salt,
    expectedCommitment: scoreCommitment,
  });
  if (!continuity.verified) {
    throw new Error(
      `Commitment continuity check FAILED for procurement #${procurementId}: ` +
      `expected=${continuity.expectedCommitment} recomputed=${continuity.recomputedCommitment}`
    );
  }

  // 3. Load adjudication for metadata
  const adjudication = await readJson(path.join(scoringDir, "adjudication_result.json"), null);

  // 4. Build reveal handoff
  const handoff = await buildValidatorScoreRevealHandoff({
    procurementId,
    score,
    salt,
    adjudication,
  });

  // 5. Assert gate
  const state = await getProcState(procurementId);
  await assertValidatorScoreRevealGate({ procurementId, procState: state });

  // 6. Transition state
  await transitionProcStatus(procurementId, PROC_STATUS.VALIDATOR_SCORE_REVEAL_READY, {
    validatorRevealPrepared: true,
    validatorRevealContinuityCheck: continuity,
  });

  console.log(`[validator-scoring] score reveal ready for procurement #${procurementId} (score=${score})`);
  return handoff;
}
