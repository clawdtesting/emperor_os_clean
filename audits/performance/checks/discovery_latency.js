// audits/performance/checks/discovery_latency.js
// Measures how fast the agent can process job discovery fixtures (proxy for real latency).

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";
import { elapsedMs } from "../../lib/time_utils.js";

const CHECK_NAME = "performance.discovery_latency";

// Thresholds in ms for processing all fixtures
const WARN_MS = 500;
const FAIL_MS = 2000;

export async function run(ctx) {
  const start = Date.now();

  const t0 = Date.now();
  let fixtures = [];

  try {
    const agiFix = await loadAllFixtures("jobs/agijobmanager");
    const primeFix = await loadAllFixtures("jobs/prime");
    fixtures = [...agiFix, ...primeFix];
  } catch {
    // Directory may not exist
  }

  const loadMs = elapsedMs(t0);

  // Simulate filtering/scoring
  const t1 = Date.now();
  const eligible = fixtures.filter(f => {
    const reward = Number(f.data.reward ?? 0);
    return reward > 0 && f.data.status !== "taken";
  });
  const filterMs = elapsedMs(t1);

  const totalMs = loadMs + filterMs;

  addMetric(ctx, "discovery.totalFixtures", fixtures.length);
  addMetric(ctx, "discovery.eligibleJobs", eligible.length);
  addMetric(ctx, "discovery.loadMs", loadMs);
  addMetric(ctx, "discovery.filterMs", filterMs);
  addMetric(ctx, "discovery.totalMs", totalMs);

  if (totalMs >= FAIL_MS) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `Discovery latency too high: ${totalMs}ms (threshold: ${FAIL_MS}ms)`,
      durationMs: Date.now() - start,
      extra: { totalMs, fixtures: fixtures.length },
    });
  } else if (totalMs >= WARN_MS) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `Discovery latency elevated: ${totalMs}ms (warn at ${WARN_MS}ms)`,
      durationMs: Date.now() - start,
      extra: { totalMs },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Discovery latency acceptable: ${totalMs}ms for ${fixtures.length} fixture(s)`,
      durationMs: Date.now() - start,
      extra: { totalMs, eligible: eligible.length },
    });
  }

  return ctx;
}
