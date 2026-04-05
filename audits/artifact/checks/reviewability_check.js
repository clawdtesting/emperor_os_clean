// audits/artifact/checks/reviewability_check.js
// Confirms artifacts contain enough human-readable context for review before signing.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";

const CHECK_NAME = "artifact.reviewability_check";

// Fields a human reviewer needs to make an informed signing decision
const REVIEWABILITY_FIELDS = [
  "jobId",
  "createdAt",
];

const HIGHLY_RECOMMENDED = [
  "result",
  "ipfsHash",
  "contentHash",
];

export async function run(ctx) {
  const start = Date.now();

  let files;
  try {
    files = await listFiles(ARTIFACTS_ROOT, f => f.endsWith(".json") && !f.includes("manifest"));
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "Artifacts directory not accessible — reviewability check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No artifacts to check reviewability",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const notReviewable = [];
  let reviewable = 0;

  for (const file of files) {
    let data;
    try { data = await readJson(file); } catch { continue; }

    const missingRequired = REVIEWABILITY_FIELDS.filter(f => data[f] === undefined);
    if (missingRequired.length > 0) {
      notReviewable.push(`${file}: missing [${missingRequired.join(", ")}]`);
      continue;
    }
    reviewable++;
  }

  addMetric(ctx, "reviewability.reviewable", reviewable);
  addMetric(ctx, "reviewability.not_reviewable", notReviewable.length);

  if (notReviewable.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `${notReviewable.length} artifact(s) not human-reviewable: ${notReviewable.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
      extra: { notReviewable },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${reviewable} artifact(s) are human-reviewable`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
