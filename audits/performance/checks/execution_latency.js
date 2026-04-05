// audits/performance/checks/execution_latency.js
// Measures end-to-end latency of the mock execution pipeline (encoding + hashing).

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { encodeFunctionCall } from "../../lib/abi_utils.js";
import { sha256Json } from "../../lib/hash_utils.js";
import { elapsedMs } from "../../lib/time_utils.js";
import { nowIso } from "../../lib/time_utils.js";

const CHECK_NAME = "performance.execution_latency";

// Full pipeline should complete in under this many ms
const WARN_MS = 200;
const FAIL_MS = 1000;

const SUBMIT_ABI = [
  "function submitCompletion(uint256 jobId, string ipfsHash, bytes32 contentHash)",
];

export async function run(ctx) {
  const start = Date.now();

  // Run the full mock pipeline N times and measure
  const N = 10;
  const t0 = Date.now();

  for (let i = 0; i < N; i++) {
    const artifact = { jobId: i, result: `result_${i}`, createdAt: nowIso() };
    const contentHash = "0x" + sha256Json(artifact);
    const ipfsHash = `QmTest${i}`;

    encodeFunctionCall(SUBMIT_ABI, "submitCompletion", [
      BigInt(i),
      ipfsHash,
      contentHash.padEnd(66, "0").slice(0, 66),
    ]);
  }

  const totalMs = elapsedMs(t0);
  const perRunMs = Math.round(totalMs / N);

  addMetric(ctx, "execution_latency.totalMs", totalMs);
  addMetric(ctx, "execution_latency.perRunMs", perRunMs);
  addMetric(ctx, "execution_latency.runs", N);

  if (totalMs >= FAIL_MS) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `Execution pipeline too slow: ${totalMs}ms for ${N} runs (threshold: ${FAIL_MS}ms)`,
      durationMs: Date.now() - start,
      extra: { totalMs, perRunMs, N },
    });
  } else if (totalMs >= WARN_MS) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `Execution pipeline elevated: ${totalMs}ms for ${N} runs (~${perRunMs}ms/run)`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Execution latency acceptable: ${totalMs}ms for ${N} runs (~${perRunMs}ms/run)`,
      durationMs: Date.now() - start,
      extra: { totalMs, perRunMs, N },
    });
  }

  return ctx;
}
