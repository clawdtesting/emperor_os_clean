// audits/performance/checks/llm_budget_usage.js
// Checks artifact LLM token/call budget usage against configured limits.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";

const CHECK_NAME = "performance.llm_budget_usage";

const MAX_TOKENS_PER_JOB = 8000;
const WARN_TOKENS_PER_JOB = 6000;
const MAX_CALLS_PER_JOB = 1;

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
      details: "No artifacts — LLM budget check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "No artifacts — LLM budget within limits by absence",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const overBudget = [];
  const nearBudget = [];
  let totalTokens = 0;
  let checked = 0;

  for (const file of files) {
    let data;
    try { data = await readJson(file); } catch { continue; }

    const tokens = data.totalTokens ?? data.tokenCount ?? data.llmTokens;
    const calls = data.llmCallCount ?? data.llmCalls;

    if (tokens !== undefined) {
      checked++;
      totalTokens += Number(tokens);
      if (Number(tokens) > MAX_TOKENS_PER_JOB) {
        overBudget.push(`${file}: tokens=${tokens} (max=${MAX_TOKENS_PER_JOB})`);
      } else if (Number(tokens) > WARN_TOKENS_PER_JOB) {
        nearBudget.push(`${file}: tokens=${tokens} (warn at ${WARN_TOKENS_PER_JOB})`);
      }
    }

    if (calls !== undefined && Number(calls) > MAX_CALLS_PER_JOB) {
      overBudget.push(`${file}: llmCalls=${calls} (max=${MAX_CALLS_PER_JOB})`);
    }
  }

  addMetric(ctx, "llm_budget.total_tokens", totalTokens);
  addMetric(ctx, "llm_budget.artifacts_checked", checked);

  if (overBudget.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `LLM budget exceeded: ${overBudget.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
      extra: { overBudget },
    });
  } else if (nearBudget.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `LLM budget near limit: ${nearBudget.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: checked > 0
        ? `LLM budget within limits — ${checked} artifact(s) checked, ${totalTokens} total tokens`
        : "No LLM usage data in artifacts",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
