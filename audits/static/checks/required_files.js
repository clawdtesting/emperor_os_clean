// audits/static/checks/required_files.js
// Verifies required doctrine files exist at the workspace root.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { WORKSPACE_ROOT, REQUIRED_DOCTRINE_FILES } from "../../lib/constants.js";
import { fileExists } from "../../lib/fs_utils.js";
import path from "path";

const CHECK_NAME = "static.required_files";

export async function run(ctx) {
  const start = Date.now();
  const missing = [];
  const present = [];

  for (const filename of REQUIRED_DOCTRINE_FILES) {
    const filePath = path.join(WORKSPACE_ROOT, filename);
    const exists = await fileExists(filePath);
    if (exists) {
      present.push(filename);
    } else {
      missing.push(filename);
    }
  }

  if (missing.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `Missing required doctrine files: ${missing.join(", ")}`,
      durationMs: Date.now() - start,
      extra: { missing, present },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All required doctrine files present: ${present.join(", ")}`,
      durationMs: Date.now() - start,
      extra: { present },
    });
  }

  return ctx;
}
