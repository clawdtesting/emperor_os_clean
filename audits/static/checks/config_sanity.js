// audits/static/checks/config_sanity.js
// Verifies package.json is well-formed and declares expected module type.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { WORKSPACE_ROOT } from "../../lib/constants.js";
import { readJson } from "../../lib/fs_utils.js";
import path from "path";

const CHECK_NAME = "static.config_sanity";

export async function run(ctx) {
  const start = Date.now();

  let pkg;
  try {
    pkg = await readJson(path.join(WORKSPACE_ROOT, "package.json"));
  } catch (err) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `Cannot read package.json: ${err.message}`,
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const issues = [];

  if (!pkg.name) issues.push("Missing package.name");
  if (!pkg.version) issues.push("Missing package.version");
  if (pkg.type !== "module") issues.push(`package.type should be "module", got: ${pkg.type ?? "(unset)"}`);
  if (!pkg.engines?.node) issues.push("Missing engines.node — Node version requirement not declared");

  if (issues.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: issues.join("; "),
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `package.json valid — name=${pkg.name}, version=${pkg.version}, type=module`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
