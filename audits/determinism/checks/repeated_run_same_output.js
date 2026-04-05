// audits/determinism/checks/repeated_run_same_output.js
// Runs the same encoding/hashing pipeline twice and confirms identical output.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { encodeFunctionCall, getSelector } from "../../lib/abi_utils.js";
import { sha256Json } from "../../lib/hash_utils.js";
import { AGI_JOB_MANAGER, MAINNET_CHAIN_ID } from "../../lib/constants.js";
import { nowIso } from "../../lib/time_utils.js";

const CHECK_NAME = "determinism.repeated_run_same_output";

const SUBMIT_ABI = [
  "function submitCompletion(uint256 jobId, string ipfsHash, bytes32 contentHash)",
];

function buildPackage(jobId) {
  const artifact = { jobId, result: "deterministic_test", score: 100 };
  const contentHash = "0x" + sha256Json(artifact);
  const ipfsHash = "QmTestDeterminism" + jobId;
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
  };
}

export async function run(ctx) {
  const start = Date.now();
  const failures = [];

  const TEST_JOB_IDS = [1, 42, 999, 100000];

  for (const jobId of TEST_JOB_IDS) {
    const run1 = buildPackage(jobId);
    const run2 = buildPackage(jobId);

    if (run1.contentHash !== run2.contentHash) {
      failures.push(`jobId=${jobId}: contentHash not stable`);
    }
    if (run1.calldata !== run2.calldata) {
      failures.push(`jobId=${jobId}: calldata not stable`);
    }
    if (run1.selector !== run2.selector) {
      failures.push(`jobId=${jobId}: selector not stable`);
    }
    if (run1.ipfsHash !== run2.ipfsHash) {
      failures.push(`jobId=${jobId}: ipfsHash not stable`);
    }
  }

  addMetric(ctx, "repeated_run.test_cases", TEST_JOB_IDS.length);
  addMetric(ctx, "repeated_run.failures", failures.length);

  if (failures.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Non-deterministic output detected: ${failures.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { failures },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Repeated run produces identical output for all ${TEST_JOB_IDS.length} test cases`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
