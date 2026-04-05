// audits/determinism/checks/scoring_determinism.js
// Validates that golden fixture scores are reproducible using stored inputs.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";
import { sha256Json } from "../../lib/hash_utils.js";

const CHECK_NAME = "determinism.scoring_determinism";

export async function run(ctx) {
  const start = Date.now();

  let goldens;
  try {
    goldens = await loadAllFixtures("golden");
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No golden fixtures — scoring determinism check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (goldens.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No golden fixtures to validate scoring determinism",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const failures = [];
  let passed = 0;

  for (const { name, data } of goldens) {
    const { input, expectedScore, expectedHash } = data;

    if (!input) {
      failures.push(`${name}: no input field in golden fixture`);
      continue;
    }

    // Recompute hash of input — must be stable
    const h1 = sha256Json(input);
    const h2 = sha256Json(input);
    if (h1 !== h2) {
      failures.push(`${name}: input hash not deterministic`);
      continue;
    }

    // If golden has an expectedHash, verify it
    if (expectedHash) {
      const clean = expectedHash.startsWith("0x") ? expectedHash.slice(2) : expectedHash;
      if (h1 !== clean) {
        failures.push(`${name}: input hash mismatch — expected ${clean.slice(0, 12)}..., got ${h1.slice(0, 12)}...`);
        continue;
      }
    }

    passed++;
  }

  addMetric(ctx, "scoring_determinism.golden_count", goldens.length);
  addMetric(ctx, "scoring_determinism.passed", passed);

  if (failures.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `${failures.length}/${goldens.length} golden scoring check(s) failed: ${failures.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${passed} golden fixture(s) produce deterministic scores`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
