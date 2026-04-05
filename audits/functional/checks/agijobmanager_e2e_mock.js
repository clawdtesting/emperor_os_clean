// audits/functional/checks/agijobmanager_e2e_mock.js
// Mock end-to-end test: discover job → apply → build completion → produce unsigned tx.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";
import { encodeFunctionCall, getSelector } from "../../lib/abi_utils.js";
import { sha256Json } from "../../lib/hash_utils.js";

const CHECK_NAME = "functional.agijobmanager_e2e_mock";

const SUBMIT_COMPLETION_ABI = [
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
      details: "No AGI job manager fixtures — e2e mock skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (jobs.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No fixtures to test — e2e mock skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const failures = [];
  let passed = 0;

  for (const { name, data } of jobs) {
    const jobId = data.jobId ?? data.id;
    if (!jobId) {
      failures.push(`${name}: no jobId`);
      continue;
    }

    // Mock: build artifact
    const artifact = {
      jobId,
      result: "mock_result",
      score: 100,
      createdAt: new Date().toISOString(),
    };

    // Mock: build content hash
    const contentHash = "0x" + sha256Json(artifact);
    const ipfsHash = "QmMockIPFSHash" + String(jobId);

    // Mock: encode calldata
    const calldata = encodeFunctionCall(SUBMIT_COMPLETION_ABI, "submitCompletion", [
      BigInt(jobId),
      ipfsHash,
      contentHash.padEnd(66, "0").slice(0, 66),
    ]);

    if (!calldata) {
      failures.push(`${name}: calldata encoding failed`);
      continue;
    }

    const selector = getSelector(calldata);
    if (!selector || selector.length !== 10) {
      failures.push(`${name}: invalid selector ${selector}`);
      continue;
    }

    passed++;
  }

  addMetric(ctx, "agijobmanager_e2e.jobs_tested", jobs.length);
  addMetric(ctx, "agijobmanager_e2e.passed", passed);

  if (failures.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `${failures.length}/${jobs.length} e2e mock(s) failed: ${failures.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `AGI job manager e2e mock passed for all ${passed} fixture(s)`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
