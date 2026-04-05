// audits/doctrine/checks/max_one_llm_call_per_job.js
// Verifies that LLM call count per job is bounded to 1 (doctrine rule).

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";
import { DOCTRINE_RULES } from "../../lib/doctrine_rules.js";

const CHECK_NAME = "doctrine.max_one_llm_call_per_job";
const MAX_CALLS = DOCTRINE_RULES.maxLlmCallsPerJob;

export async function run(ctx) {
  const start = Date.now();

  let files;
  try {
    files = await listFiles(ARTIFACTS_ROOT, f => f.endsWith(".json"));
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No artifacts to check LLM call counts",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "No artifacts — LLM call doctrine satisfied by absence",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const violations = [];
  let checked = 0;

  for (const file of files) {
    let data;
    try { data = await readJson(file); } catch { continue; }

    const llmCalls = data.llmCallCount ?? data.llmCalls ?? data.inferenceCount;
    if (llmCalls === undefined) continue;

    checked++;
    if (Number(llmCalls) > MAX_CALLS) {
      violations.push(`${file}: llmCalls=${llmCalls} (max=${MAX_CALLS})`);
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `${violations.length} artifact(s) exceed max LLM calls (${MAX_CALLS}): ${violations.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations, maxAllowed: MAX_CALLS },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: checked > 0
        ? `All ${checked} artifact(s) with LLM call counts are within limit (max=${MAX_CALLS})`
        : "No LLM call metadata in artifacts — doctrine assumed compliant",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
