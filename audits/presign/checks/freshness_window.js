// audits/presign/checks/freshness_window.js
// Ensures the signing manifest was created within the allowed freshness window.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT, MAX_FRESHNESS_MS } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";
import { isFresh } from "../../lib/time_utils.js";

const CHECK_NAME = "presign.freshness_window";

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
      details: "No artifacts directory — freshness check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No signing manifests found — freshness check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const stale = [];
  const missing = [];

  for (const file of files) {
    let manifest;
    try { manifest = await readJson(file); } catch { continue; }

    const ts = manifest.createdAt || manifest.timestamp || manifest.generatedAt;
    if (!ts) {
      missing.push(file);
      continue;
    }
    if (!isFresh(ts, MAX_FRESHNESS_MS)) {
      const ageMin = ((Date.now() - new Date(ts).getTime()) / 60000).toFixed(1);
      stale.push(`${file} (age=${ageMin}min)`);
    }
  }

  if (stale.length > 0 || missing.length > 0) {
    const issues = [
      ...stale.map(s => `stale: ${s}`),
      ...missing.map(m => `no-timestamp: ${m}`),
    ];
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Freshness violation(s): ${issues.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { stale, missing, maxFreshnessMs: MAX_FRESHNESS_MS },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${files.length} manifest(s) within ${MAX_FRESHNESS_MS / 60000}min freshness window`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
