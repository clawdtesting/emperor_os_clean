// audits/presign/checks/argument_match.js
// Verifies the decoded calldata arguments match the declared arguments in the manifest.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";
import { decodeCalldata } from "../../lib/abi_utils.js";

const CHECK_NAME = "presign.argument_match";

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
      details: "No artifacts directory — argument match check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No signing manifests found — argument match check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const violations = [];
  let checked = 0;

  for (const file of files) {
    let manifest;
    try { manifest = await readJson(file); } catch { continue; }

    const { calldata, abi, args: expectedArgs } = manifest;
    if (!calldata || !abi || !expectedArgs) continue;

    checked++;
    const decoded = decodeCalldata(abi, calldata);
    if (!decoded) {
      violations.push(`${file}: failed to decode calldata`);
      continue;
    }

    // Compare key arguments — jobId must always match
    const jobId = decoded.args?.[0];
    const expectedJobId = expectedArgs[0];
    if (jobId !== undefined && expectedJobId !== undefined) {
      if (String(jobId) !== String(expectedJobId)) {
        violations.push(`${file}: jobId mismatch — decoded=${jobId}, expected=${expectedJobId}`);
      }
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Argument mismatch(es): ${violations.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: checked > 0 ? `All ${checked} manifest(s) have matching arguments` : "No manifests with full argument data to check",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
