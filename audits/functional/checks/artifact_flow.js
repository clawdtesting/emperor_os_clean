// audits/functional/checks/artifact_flow.js
// Tests the artifact creation flow: given a job, can we produce a valid artifact?

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";
import { sha256Json } from "../../lib/hash_utils.js";
import { hasRequiredKeys } from "../../lib/json_utils.js";
import { nowIso } from "../../lib/time_utils.js";

const CHECK_NAME = "functional.artifact_flow";

const REQUIRED_ARTIFACT_FIELDS = ["jobId", "result", "createdAt", "contentHash"];

export async function run(ctx) {
  const start = Date.now();

  let jobs;
  try {
    jobs = await loadAllFixtures("jobs/agijobmanager");
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No job fixtures — artifact flow test skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (jobs.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No job fixtures to test artifact flow",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const failures = [];
  let passed = 0;

  for (const { name, data } of jobs) {
    const jobId = data.jobId ?? data.id;
    if (!jobId) {
      failures.push(`${name}: no jobId`);
      continue;
    }

    // Mock artifact construction
    const artifact = {
      jobId,
      result: "mock_answer_42",
      createdAt: nowIso(),
      contentHash: null, // will compute below
    };

    const { contentHash: _, ...forHashing } = artifact;
    artifact.contentHash = "0x" + sha256Json(forHashing);

    // Validate artifact structure
    const { valid, missing } = hasRequiredKeys(artifact, REQUIRED_ARTIFACT_FIELDS);
    if (!valid) {
      failures.push(`${name}: artifact missing fields [${missing.join(", ")}]`);
      continue;
    }

    if (!artifact.contentHash.startsWith("0x") || artifact.contentHash.length !== 66) {
      failures.push(`${name}: contentHash format invalid: ${artifact.contentHash}`);
      continue;
    }

    passed++;
  }

  addMetric(ctx, "artifact_flow.jobs_tested", jobs.length);
  addMetric(ctx, "artifact_flow.passed", passed);

  if (failures.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `${failures.length}/${jobs.length} artifact flow(s) failed: ${failures.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Artifact flow passed for all ${passed} fixture(s)`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
