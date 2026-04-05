// audits/doctrine/checks/unsigned_handoff_only.js
// Confirms doctrine rule: agent only produces unsigned transactions, never broadcasts.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { AGENT_ROOT, CORE_ROOT } from "../../lib/constants.js";
import { checkDoctrineViolation } from "../../lib/doctrine_rules.js";
import { searchInFiles, listFiles, readText } from "../../lib/fs_utils.js";

const CHECK_NAME = "doctrine.unsigned_handoff_only";
const JS_FILTER = f => (f.endsWith(".js") || f.endsWith(".ts")) && !f.includes("node_modules") && !f.includes("audits/");

export async function run(ctx) {
  const start = Date.now();
  const violations = [];

  for (const dir of [AGENT_ROOT, CORE_ROOT]) {
    let files;
    try { files = await listFiles(dir, JS_FILTER); } catch { continue; }

    for (const file of files) {
      let code;
      try { code = await readText(file); } catch { continue; }

      const result = checkDoctrineViolation(code, "unsignedHandoffOnly");
      if (result.violated) {
        violations.push(`${file}: ${result.reason}`);
      }
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Unsigned-handoff doctrine violated: ${violations.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "Unsigned-handoff doctrine satisfied — no signing/broadcast patterns in source",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
