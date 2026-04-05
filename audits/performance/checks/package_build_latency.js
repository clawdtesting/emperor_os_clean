// audits/performance/checks/package_build_latency.js
// Measures how fast a complete submission package can be built.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { encodeFunctionCall, getSelector } from "../../lib/abi_utils.js";
import { sha256Json } from "../../lib/hash_utils.js";
import { elapsedMs, nowIso } from "../../lib/time_utils.js";
import { AGI_JOB_MANAGER, MAINNET_CHAIN_ID } from "../../lib/constants.js";

const CHECK_NAME = "performance.package_build_latency";

const WARN_MS_PER_PACKAGE = 50;
const FAIL_MS_PER_PACKAGE = 200;

const SUBMIT_ABI = [
  "function submitCompletion(uint256 jobId, string ipfsHash, bytes32 contentHash)",
];

function buildPackage(jobId) {
  const artifact = { jobId, result: "test_result", createdAt: nowIso() };
  const contentHash = "0x" + sha256Json(artifact);
  const ipfsHash = `QmPkgBuild${jobId}`;

  const calldata = encodeFunctionCall(SUBMIT_ABI, "submitCompletion", [
    BigInt(jobId),
    ipfsHash,
    contentHash.padEnd(66, "0").slice(0, 66),
  ]);

  return {
    artifact,
    contentHash,
    ipfsHash,
    calldata,
    selector: calldata ? getSelector(calldata) : null,
    manifest: {
      jobId,
      targetContract: AGI_JOB_MANAGER,
      chainId: MAINNET_CHAIN_ID,
      calldata,
      contentHash,
      createdAt: nowIso(),
    },
  };
}

export async function run(ctx) {
  const start = Date.now();
  const N = 20;

  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    buildPackage(i + 1);
  }
  const totalMs = elapsedMs(t0);
  const perPackageMs = Math.round(totalMs / N);

  addMetric(ctx, "package_build.totalMs", totalMs);
  addMetric(ctx, "package_build.perPackageMs", perPackageMs);
  addMetric(ctx, "package_build.count", N);

  if (perPackageMs >= FAIL_MS_PER_PACKAGE) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `Package build too slow: ${perPackageMs}ms/package (threshold: ${FAIL_MS_PER_PACKAGE}ms)`,
      durationMs: Date.now() - start,
      extra: { perPackageMs, N },
    });
  } else if (perPackageMs >= WARN_MS_PER_PACKAGE) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `Package build elevated: ${perPackageMs}ms/package (warn at ${WARN_MS_PER_PACKAGE}ms)`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Package build fast: ${perPackageMs}ms/package across ${N} packages (${totalMs}ms total)`,
      durationMs: Date.now() - start,
      extra: { perPackageMs, totalMs, N },
    });
  }

  return ctx;
}
