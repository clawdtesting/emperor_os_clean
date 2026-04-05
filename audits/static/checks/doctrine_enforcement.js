// audits/static/checks/doctrine_enforcement.js
// Scans agent source for doctrine violations (forbidden patterns in non-audit code).

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { AGENT_ROOT, CORE_ROOT } from "../../lib/constants.js";
import { getForbiddenPatterns } from "../../lib/doctrine_rules.js";
import { searchInFiles } from "../../lib/fs_utils.js";

const CHECK_NAME = "static.doctrine_enforcement";

export async function run(ctx) {
  const start = Date.now();
  const forbidden = getForbiddenPatterns();
  const violations = [];

  for (const dir of [AGENT_ROOT, CORE_ROOT]) {
    for (const pattern of forbidden) {
      let matches;
      try {
        matches = await searchInFiles(dir, pattern, f => f.endsWith(".js") || f.endsWith(".ts"));
      } catch {
        continue;
      }
      for (const m of matches) {
        violations.push(`${pattern} in ${m.file}:${m.line}`);
      }
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `${violations.length} doctrine violation(s): ${violations.slice(0, 5).join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "No forbidden signing/broadcast patterns found in agent or core source",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
