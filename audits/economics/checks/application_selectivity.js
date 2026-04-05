// audits/economics/checks/application_selectivity.js
// Verifies that the agent applies selectively — not to every job indiscriminately.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";

const CHECK_NAME = "economics.application_selectivity";

// If the agent would apply to more than this fraction of all jobs, that's suspicious
const MAX_APPLICATION_RATE = 0.8;
const MIN_APPLICATION_RATE = 0.05;

function shouldApply(job) {
  const reward = Number(job.reward ?? 0);
  if (reward <= 0) return false;
  if (job.status === "taken" || job.status === "completed") return false;
  if (job.difficulty === "impossible") return false;
  return true;
}

export async function run(ctx) {
  const start = Date.now();

  let fixtures;
  try {
    const agi = await loadAllFixtures("jobs/agijobmanager");
    const prime = await loadAllFixtures("jobs/prime");
    fixtures = [...agi, ...prime];
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No job fixtures — selectivity check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (fixtures.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No fixtures to evaluate selectivity",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const wouldApply = fixtures.filter(f => shouldApply(f.data));
  const rate = wouldApply.length / fixtures.length;

  addMetric(ctx, "selectivity.total_jobs", fixtures.length);
  addMetric(ctx, "selectivity.would_apply", wouldApply.length);
  addMetric(ctx, "selectivity.application_rate", rate);

  if (rate > MAX_APPLICATION_RATE) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `Application rate too high: ${(rate * 100).toFixed(1)}% (max: ${MAX_APPLICATION_RATE * 100}%) — agent may not be selective enough`,
      durationMs: Date.now() - start,
      extra: { rate, total: fixtures.length, applying: wouldApply.length },
    });
  } else if (rate < MIN_APPLICATION_RATE && fixtures.length > 10) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `Application rate very low: ${(rate * 100).toFixed(1)}% — filtering may be too aggressive`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Application selectivity healthy: ${(rate * 100).toFixed(1)}% (${wouldApply.length}/${fixtures.length} jobs)`,
      durationMs: Date.now() - start,
      extra: { rate, applying: wouldApply.length, total: fixtures.length },
    });
  }

  return ctx;
}
