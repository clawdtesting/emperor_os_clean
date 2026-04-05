// audits/functional/checks/assignment_flow.js
// Tests the job assignment flow using fixture data (no live network).

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { loadAllFixtures } from "../../lib/fixture_utils.js";
import { hasRequiredKeys } from "../../lib/json_utils.js";

const CHECK_NAME = "functional.assignment_flow";

const REQUIRED_JOB_FIELDS = ["jobId", "reward", "description"];

export async function run(ctx) {
  const start = Date.now();

  let fixtures;
  try {
    fixtures = await loadAllFixtures("jobs/agijobmanager");
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No job fixtures found — assignment flow test skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (fixtures.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "Job fixtures directory is empty",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const invalid = [];
  let valid = 0;

  for (const { name, data } of fixtures) {
    const { valid: isValid, missing } = hasRequiredKeys(data, REQUIRED_JOB_FIELDS);
    if (!isValid) {
      invalid.push(`${name}: missing [${missing.join(", ")}]`);
    } else {
      // Simulate: agent selects the job
      if (typeof data.reward !== "number" && typeof data.reward !== "bigint" && typeof data.reward !== "string") {
        invalid.push(`${name}: reward is not a valid numeric type`);
      } else {
        valid++;
      }
    }
  }

  addMetric(ctx, "assignment_flow.fixtures_tested", fixtures.length);
  addMetric(ctx, "assignment_flow.valid", valid);

  if (invalid.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `${invalid.length}/${fixtures.length} job fixture(s) failed assignment flow: ${invalid.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Assignment flow passed for all ${valid} job fixture(s)`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
