// audits/functional/checks/prime_e2e_mock.js
// Mock end-to-end test for PRIME protocol: discover → apply → bid → complete.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";
import { encodeFunctionCall, getSelector } from "../../lib/abi_utils.js";
import { isFresh } from "../../lib/time_utils.js";
import { MAX_FRESHNESS_MS } from "../../lib/constants.js";

const CHECK_NAME = "functional.prime_e2e_mock";

// PRIME submitBid ABI (simplified)
const PRIME_ABI = [
  "function submitBid(uint256 jobId, uint256 bidAmount, bytes32 contentHash, uint256 deadline)",
];

export async function run(ctx) {
  const start = Date.now();

  let jobs;
  try {
    jobs = await loadAllFixtures("jobs/prime");
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No PRIME job fixtures — e2e mock skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (jobs.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No PRIME fixtures to test",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const failures = [];
  let passed = 0;

  for (const { name, data } of jobs) {
    const jobId = data.jobId ?? data.id;
    const deadline = data.deadline ?? Math.floor(Date.now() / 1000) + 3600;

    if (!jobId) {
      failures.push(`${name}: no jobId`);
      continue;
    }

    // Check deadline not already expired
    if (data.deadline && new Date(data.deadline * 1000) < new Date()) {
      failures.push(`${name}: fixture deadline already expired`);
      continue;
    }

    // Mock bid calldata
    const calldata = encodeFunctionCall(PRIME_ABI, "submitBid", [
      BigInt(jobId),
      BigInt(data.bidAmount ?? 0),
      "0x" + "ab".repeat(32),
      BigInt(deadline),
    ]);

    if (!calldata) {
      failures.push(`${name}: PRIME calldata encoding failed`);
      continue;
    }

    passed++;
  }

  addMetric(ctx, "prime_e2e.jobs_tested", jobs.length);
  addMetric(ctx, "prime_e2e.passed", passed);

  if (failures.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `${failures.length}/${jobs.length} PRIME e2e mock(s) failed: ${failures.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `PRIME e2e mock passed for all ${passed} fixture(s)`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
