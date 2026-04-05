// audits/presign/checks/simulation_pass_required.js
// Verifies that a simulation result exists and passed before allowing signing.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";

const CHECK_NAME = "presign.simulation_pass_required";

export async function run(ctx) {
  const start = Date.now();

  let files;
  try {
    files = await listFiles(ARTIFACTS_ROOT, f => f.includes("manifest") && f.endsWith(".json"));
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No artifacts directory — simulation check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No signing manifests — simulation pass check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const violations = [];

  for (const file of files) {
    let manifest;
    try { manifest = await readJson(file); } catch { continue; }

    const sim = manifest.simulation || manifest.simulationResult;
    if (!sim) {
      violations.push(`${file}: no simulation result attached to manifest`);
      continue;
    }
    if (sim.success === false || sim.status === "failed" || sim.reverted === true) {
      violations.push(`${file}: simulation failed — ${sim.error || sim.reason || "unknown reason"}`);
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Simulation requirement not met: ${violations.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${files.length} manifest(s) have a passing simulation result`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
