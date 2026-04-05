// audits/economics/checks/cost_reward_ratio.js
// Checks that jobs in fixtures have a favorable cost-to-reward ratio.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";

const CHECK_NAME = "economics.cost_reward_ratio";

// Minimum reward (in wei) we consider worth pursuing
const MIN_REWARD_WEI = BigInt("100000000000000000"); // 0.1 ETH/AGI
// Estimated gas cost per job in ETH (approximate)
const ESTIMATED_GAS_COST_ETH = 0.005; // 0.005 ETH
const ESTIMATED_GAS_COST_WEI = BigInt(Math.floor(ESTIMATED_GAS_COST_ETH * 1e18));

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
      details: "No job fixtures — cost/reward ratio check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (fixtures.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No job fixtures to evaluate ratios",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const unprofitable = [];
  const profitable = [];
  let checked = 0;

  for (const { name, data } of fixtures) {
    const rewardRaw = data.reward;
    if (rewardRaw === undefined || rewardRaw === null) continue;

    checked++;
    let rewardWei;
    try {
      rewardWei = BigInt(String(rewardRaw));
    } catch {
      unprofitable.push(`${name}: reward not parseable as BigInt: ${rewardRaw}`);
      continue;
    }

    if (rewardWei < MIN_REWARD_WEI) {
      unprofitable.push(`${name}: reward ${rewardWei} < min ${MIN_REWARD_WEI}`);
    } else if (rewardWei <= ESTIMATED_GAS_COST_WEI) {
      unprofitable.push(`${name}: reward barely covers gas cost`);
    } else {
      profitable.push(name);
    }
  }

  addMetric(ctx, "cost_reward.checked", checked);
  addMetric(ctx, "cost_reward.profitable", profitable.length);
  addMetric(ctx, "cost_reward.unprofitable", unprofitable.length);

  if (unprofitable.length > 0 && profitable.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `All ${unprofitable.length} job(s) with reward data are below profitability threshold`,
      durationMs: Date.now() - start,
      extra: { unprofitable: unprofitable.slice(0, 5) },
    });
  } else if (checked === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No job fixtures have reward data — cannot evaluate cost/reward ratio",
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `${profitable.length}/${checked} jobs with reward data are profitable`,
      durationMs: Date.now() - start,
      extra: { profitable: profitable.length, checked },
    });
  }

  return ctx;
}
