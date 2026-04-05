// audits/determinism/checks/artifact_hash_stability.js
// Verifies that re-hashing artifact content produces the same stored contentHash.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";
import { sha256Json, hashMatch } from "../../lib/hash_utils.js";

const CHECK_NAME = "determinism.artifact_hash_stability";

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
      details: "No artifacts directory — hash stability check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No artifacts — hash stability not checkable",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const unstable = [];
  let stable = 0;

  for (const file of files) {
    let data;
    try { data = await readJson(file); } catch { continue; }

    const stored = data.contentHash;
    if (!stored) continue;

    const { contentHash: _, ...forHashing } = data;

    // Hash twice to confirm stability
    const hash1 = sha256Json(forHashing);
    const hash2 = sha256Json(forHashing);

    if (hash1 !== hash2) {
      unstable.push(`${file}: sha256Json is not stable (got different results twice)`);
      continue;
    }

    const storedClean = stored.startsWith("0x") ? stored.slice(2) : stored;
    if (!hashMatch(hash1, storedClean)) {
      unstable.push(`${file}: stored hash doesn't match re-computed hash`);
    } else {
      stable++;
    }
  }

  addMetric(ctx, "hash_stability.stable", stable);
  addMetric(ctx, "hash_stability.unstable", unstable.length);

  if (unstable.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `${unstable.length} hash instability issue(s): ${unstable.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
      extra: { unstable },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${stable} artifact hash(es) are stable and reproducible`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
