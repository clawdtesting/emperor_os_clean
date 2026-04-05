// audits/integration/checks/mcp_connectivity.js
// Tests MCP server connectivity and measures response latency.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { checkMcpConnectivity } from "../../lib/mcp_utils.js";
import { getEnv } from "../../lib/env_utils.js";

const CHECK_NAME = "integration.mcp_connectivity";
const MCP_TIMEOUT_MS = 10_000;

export async function run(ctx) {
  const start = Date.now();

  const mcpEndpoint = getEnv("AGI_ALPHA_MCP");
  if (!mcpEndpoint) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "AGI_ALPHA_MCP not set — MCP connectivity check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  let result;
  try {
    result = await checkMcpConnectivity(MCP_TIMEOUT_MS);
  } catch (err) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `MCP connectivity check threw: ${err.message}`,
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  addMetric(ctx, "mcp.latencyMs", result.latencyMs ?? null);

  if (!result.ok) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `MCP not reachable: ${result.error}`,
      durationMs: Date.now() - start,
      extra: result,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `MCP reachable — latency=${result.latencyMs}ms`,
      durationMs: Date.now() - start,
      extra: result,
    });
  }

  return ctx;
}
