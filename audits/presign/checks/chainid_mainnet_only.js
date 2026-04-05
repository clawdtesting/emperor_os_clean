// audits/presign/checks/chainid_mainnet_only.js
// Enforces that the pending transaction targets mainnet (chainId=1) only.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { MAINNET_CHAIN_ID } from "../../lib/constants.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";

const CHECK_NAME = "presign.chainid_mainnet_only";

export async function run(ctx) {
  const start = Date.now();

  // Look for pending signing manifest
  let files;
  try {
    files = await listFiles(ARTIFACTS_ROOT, f => f.includes("manifest") && f.endsWith(".json"));
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No artifacts directory — cannot check chain ID on pending tx",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No signing manifests found — presign chain ID check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const violations = [];

  for (const file of files) {
    let manifest;
    try { manifest = await readJson(file); } catch { continue; }

    const chainId = manifest.chainId ?? manifest.chain_id;
    if (chainId === undefined) {
      violations.push(`${file}: chainId field missing`);
      continue;
    }
    if (Number(chainId) !== MAINNET_CHAIN_ID) {
      violations.push(`${file}: chainId=${chainId}, expected ${MAINNET_CHAIN_ID}`);
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Chain ID violation(s): ${violations.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${files.length} manifest(s) target mainnet (chainId=${MAINNET_CHAIN_ID})`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
