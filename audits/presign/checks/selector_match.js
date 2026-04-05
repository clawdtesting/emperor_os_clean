// audits/presign/checks/selector_match.js
// Confirms the calldata function selector matches the declared function in the manifest.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";
import { getSelector, encodeFunctionCall } from "../../lib/abi_utils.js";

const CHECK_NAME = "presign.selector_match";

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
      details: "No artifacts directory — selector match check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No signing manifests found — selector match check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const violations = [];

  for (const file of files) {
    let manifest;
    try { manifest = await readJson(file); } catch { continue; }

    const { calldata, expectedSelector, abi, functionName, args } = manifest;

    if (!calldata) {
      violations.push(`${file}: no calldata field`);
      continue;
    }

    const actualSelector = getSelector(calldata);

    if (expectedSelector && actualSelector !== expectedSelector.toLowerCase()) {
      violations.push(`${file}: selector mismatch — expected ${expectedSelector}, got ${actualSelector}`);
      continue;
    }

    // If we have enough to re-encode, cross-verify
    if (abi && functionName && args) {
      const reEncoded = encodeFunctionCall(abi, functionName, args);
      if (reEncoded) {
        const reSelector = getSelector(reEncoded);
        if (reSelector !== actualSelector) {
          violations.push(`${file}: re-encoded selector ${reSelector} !== calldata selector ${actualSelector}`);
        }
      }
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Selector mismatch(es): ${violations.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${files.length} manifest(s) have consistent function selectors`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
