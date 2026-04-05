// audits/integration/checks/rpc_health.js
// Tests RPC endpoint connectivity and validates chain ID.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { MAINNET_CHAIN_ID, BASE_CHAIN_ID } from "../../lib/constants.js";
import { checkRpcHealth } from "../../lib/rpc_utils.js";
import { getEnv } from "../../lib/env_utils.js";

const CHECK_NAME = "integration.rpc_health";
const ALLOWED_CHAIN_IDS = new Set([MAINNET_CHAIN_ID, BASE_CHAIN_ID]);

export async function run(ctx) {
  const start = Date.now();

  const rpcUrl = getEnv("RPC_URL");
  if (!rpcUrl) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "RPC_URL not set — RPC health check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  let result;
  try {
    result = await checkRpcHealth(rpcUrl);
  } catch (err) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `RPC health check threw: ${err.message}`,
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  addMetric(ctx, "rpc.latencyMs", result.latencyMs);
  addMetric(ctx, "rpc.chainId", result.chainId);
  addMetric(ctx, "rpc.blockNumber", result.blockNumber);

  if (!result.ok) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `RPC not healthy: ${result.error}`,
      durationMs: Date.now() - start,
      extra: result,
    });
    return ctx;
  }

  if (!ALLOWED_CHAIN_IDS.has(Number(result.chainId))) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `RPC returned unexpected chainId=${result.chainId} (allowed: ${[...ALLOWED_CHAIN_IDS].join(", ")})`,
      durationMs: Date.now() - start,
      extra: result,
    });
    return ctx;
  }

  addCheck(ctx, {
    name: CHECK_NAME,
    status: SEVERITY.PASS,
    severity: SEVERITY.PASS,
    details: `RPC healthy — chainId=${result.chainId}, block=${result.blockNumber}, latency=${result.latencyMs}ms`,
    durationMs: Date.now() - start,
    extra: result,
  });

  return ctx;
}
