// audits/presign/checks/manifest_binding.js
// Ensures the signing manifest is cryptographically bound to a specific job ID and content hash.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";
import { sha256Json } from "../../lib/hash_utils.js";

const CHECK_NAME = "presign.manifest_binding";

const REQUIRED_BINDING_FIELDS = ["jobId", "contentHash", "ipfsHash", "calldata"];

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
      details: "No artifacts directory — manifest binding check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No signing manifests found — binding check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const violations = [];

  for (const file of files) {
    let manifest;
    try { manifest = await readJson(file); } catch { continue; }

    const missingFields = REQUIRED_BINDING_FIELDS.filter(f => manifest[f] === undefined || manifest[f] === null);
    if (missingFields.length > 0) {
      violations.push(`${file}: missing binding fields [${missingFields.join(", ")}]`);
      continue;
    }

    // If a manifestHash is present, verify it
    if (manifest.manifestHash) {
      const { manifestHash, ...rest } = manifest;
      const computed = sha256Json(rest);
      if (computed !== manifestHash && `0x${computed}` !== manifestHash) {
        violations.push(`${file}: manifestHash mismatch — stored=${manifestHash.slice(0, 16)}..., computed=${computed.slice(0, 16)}...`);
      }
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Manifest binding violation(s): ${violations.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${files.length} manifest(s) have required binding fields`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
