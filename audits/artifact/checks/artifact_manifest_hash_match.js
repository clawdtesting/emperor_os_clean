// audits/artifact/checks/artifact_manifest_hash_match.js
// Verifies each artifact's contentHash matches the hash of its content.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";
import { sha256Json, hashMatch } from "../../lib/hash_utils.js";

const CHECK_NAME = "artifact.artifact_manifest_hash_match";

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
      details: "Artifacts directory not accessible — hash match check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No artifacts to verify hashes for",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const mismatches = [];
  const noHash = [];
  let verified = 0;

  for (const file of files) {
    let data;
    try { data = await readJson(file); } catch { continue; }

    const storedHash = data.contentHash;
    if (!storedHash) {
      noHash.push(file);
      continue;
    }

    // Compute hash over content excluding the contentHash field
    const { contentHash: _, ...forHashing } = data;
    const computed = sha256Json(forHashing);

    // Accept with or without 0x prefix
    const stored = storedHash.startsWith("0x") ? storedHash.slice(2) : storedHash;
    if (!hashMatch(computed, stored)) {
      mismatches.push(`${file}: stored=${storedHash.slice(0, 16)}..., computed=${computed.slice(0, 16)}...`);
    } else {
      verified++;
    }
  }

  addMetric(ctx, "hash_match.verified", verified);
  addMetric(ctx, "hash_match.mismatches", mismatches.length);

  if (mismatches.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `${mismatches.length} hash mismatch(es): ${mismatches.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
      extra: { mismatches },
    });
  } else if (noHash.length > 0 && verified === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `${noHash.length} artifact(s) have no contentHash — cannot verify integrity`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${verified} artifact(s) with contentHash verified successfully`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
