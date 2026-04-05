// audits/static/checks/workspace_boundary.js
// Ensures no source file references paths outside the workspace root (path traversal guard).

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { AGENT_ROOT, CORE_ROOT, WORKSPACE_ROOT } from "../../lib/constants.js";
import { searchInFiles } from "../../lib/fs_utils.js";

const CHECK_NAME = "static.workspace_boundary";
const JS_FILTER = f => (f.endsWith(".js") || f.endsWith(".ts")) && !f.includes("node_modules");

// Patterns that suggest path traversal out of workspace
const ESCAPE_PATTERNS = [
  "../../../",
  "process.env.HOME",
  "/etc/",
  "/root/",
  "/home/",
  "os.homedir()",
];

export async function run(ctx) {
  const start = Date.now();
  const hits = [];

  for (const dir of [AGENT_ROOT, CORE_ROOT]) {
    for (const pattern of ESCAPE_PATTERNS) {
      let matches;
      try {
        matches = await searchInFiles(dir, pattern, JS_FILTER);
      } catch {
        continue;
      }
      for (const m of matches) {
        // Allow references within workspace
        if (m.content && m.content.includes(WORKSPACE_ROOT)) continue;
        hits.push({ pattern, file: m.file, line: m.line });
      }
    }
  }

  if (hits.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `${hits.length} potential workspace boundary escape(s): ${hits.slice(0, 3).map(h => `${h.pattern} @ ${h.file}:${h.line}`).join("; ")}`,
      durationMs: Date.now() - start,
      extra: { hits },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "No workspace boundary escapes detected in source",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
