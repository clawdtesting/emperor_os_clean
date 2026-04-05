// audits/economics/checks/bad_job_filtering.js
// Verifies that jobs with zero/negative reward, expired deadlines, or spam are rejected.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";

const CHECK_NAME = "economics.bad_job_filtering";

// Jobs that should be filtered out
function isBadJob(job) {
  const reward = Number(job.reward ?? 0);
  if (reward <= 0) return { bad: true, reason: "zero or negative reward" };

  const deadline = job.deadline;
  if (deadline && new Date(deadline * 1000) < new Date()) {
    return { bad: true, reason: "expired deadline" };
  }

  if (job.status === "taken" || job.status === "completed" || job.status === "cancelled") {
    return { bad: true, reason: `job status is ${job.status}` };
  }

  if (typeof job.description === "string" && job.description.trim().length < 5) {
    return { bad: true, reason: "description too short (likely spam)" };
  }

  return { bad: false };
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
      details: "No job fixtures — bad job filtering check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (fixtures.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No job fixtures to evaluate",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  // Test that bad jobs in fixtures marked as "bad" are indeed detected as bad
  const markedBad = fixtures.filter(f => f.data._testExpectBad === true);
  const undetected = [];

  for (const { name, data } of markedBad) {
    const { bad } = isBadJob(data);
    if (!bad) undetected.push(`${name}: expected to be filtered but passed`);
  }

  const eligible = fixtures.filter(f => {
    const { bad } = isBadJob(f.data);
    return !bad;
  });

  addMetric(ctx, "bad_job_filter.total", fixtures.length);
  addMetric(ctx, "bad_job_filter.eligible", eligible.length);
  addMetric(ctx, "bad_job_filter.filtered", fixtures.length - eligible.length);
  addMetric(ctx, "bad_job_filter.undetected_bad", undetected.length);

  if (undetected.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `${undetected.length} bad job(s) not filtered: ${undetected.join("; ")}`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Bad job filter working — ${eligible.length}/${fixtures.length} jobs eligible after filtering`,
      durationMs: Date.now() - start,
      extra: { eligible: eligible.length, total: fixtures.length },
    });
  }

  return ctx;
}
