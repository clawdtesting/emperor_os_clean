// audits/static/checks/env_contracts.js
// Validates env contract addresses match hardcoded canonical values.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { checkEnvContracts } from "../../lib/env_utils.js";

const CHECK_NAME = "static.env_contracts";

export async function run(ctx) {
  const start = Date.now();
  const result = checkEnvContracts();

  if (!result.ok) {
    const detail = result.issues.map(i =>
      `${i.key}: expected ${i.expected}, got ${i.got}`
    ).join("; ");
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Contract address mismatch — ${detail}`,
      durationMs: Date.now() - start,
      extra: { issues: result.issues },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "All env contract addresses match canonical values (or are unset)",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
