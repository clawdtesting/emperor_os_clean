// audits/artifact/checks/artifact_schema.js
// Validates artifact files conform to the expected schema.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";
import { hasRequiredKeys } from "../../lib/json_utils.js";

const CHECK_NAME = "artifact.artifact_schema";

const REQUIRED_ARTIFACT_FIELDS = ["jobId", "createdAt"];
const RECOMMENDED_FIELDS = ["result", "contentHash", "ipfsHash"];

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
      details: "Artifacts directory not accessible — schema check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No artifact files to validate",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const invalid = [];
  const warnings = [];
  let valid = 0;

  for (const file of files) {
    let data;
    try { data = await readJson(file); } catch (err) {
      invalid.push(`${file}: JSON parse error — ${err.message}`);
      continue;
    }

    const { valid: isValid, missing } = hasRequiredKeys(data, REQUIRED_ARTIFACT_FIELDS);
    if (!isValid) {
      invalid.push(`${file}: missing required fields [${missing.join(", ")}]`);
      continue;
    }

    const missingRecommended = RECOMMENDED_FIELDS.filter(f => data[f] === undefined);
    if (missingRecommended.length > 0) {
      warnings.push(`${file}: missing recommended fields [${missingRecommended.join(", ")}]`);
    }

    valid++;
  }

  addMetric(ctx, "artifact_schema.valid", valid);
  addMetric(ctx, "artifact_schema.invalid", invalid.length);

  if (invalid.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `${invalid.length}/${files.length} artifact(s) fail schema: ${invalid.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
    });
  } else if (warnings.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `All ${valid} artifact(s) valid; ${warnings.length} missing recommended fields`,
      durationMs: Date.now() - start,
      extra: { warnings: warnings.slice(0, 5) },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${valid} artifact(s) pass schema validation`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
