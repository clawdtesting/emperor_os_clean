// audits/integration/checks/ipfs_health.js
// Tests IPFS gateway reachability by fetching a known small CID.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { getEnv } from "../../lib/env_utils.js";

const CHECK_NAME = "integration.ipfs_health";

// Well-known tiny CID (empty object pinned publicly)
const PROBE_CID = "QmbFMke1KXqnYyBBWxB74N4c5SBnJMVAiMNRcGu6x1AxC2";
const DEFAULT_GATEWAY = "https://cloudflare-ipfs.com";
const TIMEOUT_MS = 10_000;

export async function run(ctx) {
  const start = Date.now();

  const gateway = getEnv("IPFS_GATEWAY", DEFAULT_GATEWAY);
  const url = `${gateway}/ipfs/${PROBE_CID}`;

  let latencyMs = null;
  let ok = false;
  let errorMsg = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const t0 = Date.now();

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    latencyMs = Date.now() - t0;
    ok = res.ok || res.status === 200 || res.status === 206;
    if (!ok) errorMsg = `HTTP ${res.status}`;
  } catch (err) {
    errorMsg = err.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : err.message;
  }

  addMetric(ctx, "ipfs.latencyMs", latencyMs);
  addMetric(ctx, "ipfs.gateway", gateway);

  if (!ok) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `IPFS gateway not reachable via ${gateway}: ${errorMsg}`,
      durationMs: Date.now() - start,
      extra: { gateway, probeUrl: url },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `IPFS gateway healthy — ${gateway}, latency=${latencyMs}ms`,
      durationMs: Date.now() - start,
      extra: { gateway, latencyMs },
    });
  }

  return ctx;
}
