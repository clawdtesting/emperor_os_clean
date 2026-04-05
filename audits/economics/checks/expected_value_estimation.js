// audits/economics/checks/expected_value_estimation.js
// Computes expected value across job fixtures and checks it is positive.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";

const CHECK_NAME = "economics.expected_value_estimation";

// Approximate costs in AGI token units (1e18 decimals)
const GAS_COST_PER_JOB = 5_000_000_000_000_000n; // 0.005 AGI
const LLM_COST_PER_JOB = 1_000_000_000_000_000n;  // 0.001 AGI
const TOTAL_COST_PER_JOB = GAS_COST_PER_JOB + LLM_COST_PER_JOB;

// Success probability assumption
const SUCCESS_RATE = 0.7;

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
      details: "No job fixtures — expected value estimation skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (fixtures.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No fixtures to estimate expected value",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  let totalEV = 0;
  let positiveEV = 0;
  let negativeEV = 0;
  let checked = 0;

  for (const { data } of fixtures) {
    const rewardRaw = data.reward;
    if (rewardRaw === undefined) continue;

    let rewardWei;
    try { rewardWei = BigInt(String(rewardRaw)); } catch { continue; }

    checked++;

    // EV = (reward * success_rate) - cost
    const ev = Number(rewardWei) * SUCCESS_RATE - Number(TOTAL_COST_PER_JOB);
    totalEV += ev;
    if (ev > 0) positiveEV++;
    else negativeEV++;
  }

  const avgEV = checked > 0 ? totalEV / checked : 0;

  addMetric(ctx, "expected_value.avg_ev", avgEV);
  addMetric(ctx, "expected_value.positive_ev_jobs", positiveEV);
  addMetric(ctx, "expected_value.negative_ev_jobs", negativeEV);
  addMetric(ctx, "expected_value.checked", checked);

  if (checked === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No job reward data available — EV estimation skipped",
      durationMs: Date.now() - start,
    });
  } else if (avgEV <= 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `Average expected value is negative or zero (avgEV=${avgEV.toFixed(0)}). Job selection may be unprofitable.`,
      durationMs: Date.now() - start,
      extra: { avgEV, positiveEV, negativeEV, checked },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Average EV positive (avgEV=${avgEV.toFixed(0)}) — ${positiveEV}/${checked} jobs have positive EV`,
      durationMs: Date.now() - start,
      extra: { avgEV, positiveEV, negativeEV },
    });
  }

  return ctx;
}
