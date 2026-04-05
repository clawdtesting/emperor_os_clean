// audits/functional/checks/completion_package_flow.js
// Tests building a complete submission package: artifact + manifest + unsigned tx.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";
import { sha256Json } from "../../lib/hash_utils.js";
import { encodeFunctionCall, getSelector } from "../../lib/abi_utils.js";
import { nowIso } from "../../lib/time_utils.js";
import { AGI_JOB_MANAGER, MAINNET_CHAIN_ID } from "../../lib/constants.js";

const CHECK_NAME = "functional.completion_package_flow";

const SUBMIT_ABI = [
  "function submitCompletion(uint256 jobId, string ipfsHash, bytes32 contentHash)",
];

export async function run(ctx) {
  const start = Date.now();

  let jobs;
  try {
    jobs = await loadAllFixtures("jobs/agijobmanager");
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No job fixtures — completion package flow skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (jobs.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No fixtures available — completion package flow skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const failures = [];
  let passed = 0;

  for (const { name, data } of jobs) {
    const jobId = data.jobId ?? data.id;
    if (!jobId) { failures.push(`${name}: no jobId`); continue; }

    // Step 1: Build artifact
    const artifact = { jobId, result: "mock", createdAt: nowIso() };
    const contentHash = "0x" + sha256Json(artifact);
    const ipfsHash = `QmMockHash${jobId}`;

    // Step 2: Encode calldata
    const calldata = encodeFunctionCall(SUBMIT_ABI, "submitCompletion", [
      BigInt(jobId),
      ipfsHash,
      contentHash.padEnd(66, "0").slice(0, 66),
    ]);

    if (!calldata) { failures.push(`${name}: calldata encoding failed`); continue; }

    // Step 3: Build signing manifest
    const manifest = {
      jobId,
      targetContract: AGI_JOB_MANAGER,
      chainId: MAINNET_CHAIN_ID,
      calldata,
      ipfsHash,
      contentHash,
      createdAt: nowIso(),
    };

    // Step 4: Validate package completeness
    if (!manifest.calldata || !manifest.targetContract || !manifest.chainId) {
      failures.push(`${name}: incomplete manifest`);
      continue;
    }

    // Step 5: Verify selector
    const sel = getSelector(calldata);
    if (!sel || sel.length !== 10) {
      failures.push(`${name}: bad selector ${sel}`);
      continue;
    }

    passed++;
  }

  addMetric(ctx, "completion_package.jobs_tested", jobs.length);
  addMetric(ctx, "completion_package.passed", passed);

  if (failures.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `${failures.length}/${jobs.length} completion package(s) failed: ${failures.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Completion package flow passed for all ${passed} fixture(s)`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
