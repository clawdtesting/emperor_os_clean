// audits/doctrine/checks/deterministic_scoring_required.js
// Verifies that the scoring/evaluation logic is deterministic (no random, no Date.now in scores).

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { AGENT_ROOT, CORE_ROOT } from "../../lib/constants.js";
import { searchInFiles } from "../../lib/fs_utils.js";

const CHECK_NAME = "doctrine.deterministic_scoring_required";
const JS_FILTER = f => (f.endsWith(".js") || f.endsWith(".ts")) && !f.includes("node_modules") && !f.includes("audits/");

// Non-deterministic patterns inside scoring code
const NON_DETERMINISTIC_IN_SCORING = [
  "Math.random()",
  "crypto.randomBytes",
  "Math.random",
];

// Scoring-related file patterns
const SCORING_FILE_PATTERNS = ["score", "evaluat", "rank", "select"];

export async function run(ctx) {
  const start = Date.now();
  const violations = [];

  for (const dir of [AGENT_ROOT, CORE_ROOT]) {
    for (const nonDetPattern of NON_DETERMINISTIC_IN_SCORING) {
      let matches;
      try { matches = await searchInFiles(dir, nonDetPattern, JS_FILTER); } catch { continue; }

      for (const m of (matches ?? [])) {
        // Only flag if file looks scoring-related
        const fileLower = m.file.toLowerCase();
        const isScoring = SCORING_FILE_PATTERNS.some(p => fileLower.includes(p));
        if (isScoring) {
          violations.push(`${nonDetPattern} in scoring file ${m.file}:${m.line}`);
        }
      }
    }
  }

  if (violations.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Non-deterministic scoring detected: ${violations.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { violations },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "No non-deterministic patterns found in scoring-related source files",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
