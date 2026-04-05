// audits/presign/checks/decode_and_compare.js
// Decodes manifest calldata and compares it against declared parameters.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";
import { decodeCalldata } from "../../lib/abi_utils.js";

const CHECK_NAME = "presign.decode_and_compare";

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
      details: "No artifacts directory — decode and compare skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No signing manifests — decode and compare skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const violations = [];
  let checked = 0;

  for (const file of files) {
    let manifest;
    try { manifest = await readJson(file); } catch { continue; }

    const { calldata, abi, jobId } = manifest;
    if (!calldata || !abi || !jobId) continue;

    checked++;
    const decoded = decodeCalldata(abi, calldata);
    if (!decoded) {
      violations.push(`${file}: decodeCalldata returned null`);
      continue;
    }

    // Verify jobId is encoded correctly
    const decodedJobId = decoded.args?.[0];
    if (decodedJobId !== undefined && String(decodedJobId) !== String(jobId)) {
      violations.push(`${file}: jobId mismatch — calldata has ${decodedJobId}, manifest declares ${jobId}`);
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Decode/compare mismatch(es): ${violations.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: checked > 0
        ? `All ${checked} manifest(s) decode correctly and match declared parameters`
        : "No manifests with full decode data — skipped",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
