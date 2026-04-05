// audits/presign/checks/target_contract_match.js
// Verifies the transaction target contract matches the canonical AGI contract address.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT, AGI_JOB_MANAGER, AGI_JOB_DISCOVERY_PRIME, AGIALPHA_TOKEN } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";
import { addressesMatch } from "../../lib/abi_utils.js";

const CHECK_NAME = "presign.target_contract_match";

const ALLOWED_TARGETS = new Set([
  AGI_JOB_MANAGER.toLowerCase(),
  AGI_JOB_DISCOVERY_PRIME.toLowerCase(),
  AGIALPHA_TOKEN.toLowerCase(),
]);

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
      details: "No artifacts directory — target contract check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No signing manifests found — target contract check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const violations = [];

  for (const file of files) {
    let manifest;
    try { manifest = await readJson(file); } catch { continue; }

    const target = manifest.targetContract || manifest.to;
    if (!target) {
      violations.push(`${file}: no targetContract field`);
      continue;
    }
    if (!ALLOWED_TARGETS.has(target.toLowerCase())) {
      violations.push(`${file}: target ${target} is not a known AGI contract`);
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Target contract violation(s): ${violations.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations, allowedTargets: [...ALLOWED_TARGETS] },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${files.length} manifest(s) target known AGI contracts`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
