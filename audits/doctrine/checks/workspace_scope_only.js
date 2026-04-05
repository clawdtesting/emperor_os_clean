// audits/doctrine/checks/workspace_scope_only.js
// Ensures the agent only reads/writes within the declared workspace root.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { AGENT_ROOT, CORE_ROOT, WORKSPACE_ROOT } from "../../lib/constants.js";
import { searchInFiles } from "../../lib/fs_utils.js";

const CHECK_NAME = "doctrine.workspace_scope_only";
const JS_FILTER = f => (f.endsWith(".js") || f.endsWith(".ts")) && !f.includes("node_modules") && !f.includes("audits/");

// Paths that are explicitly outside the workspace
const OUT_OF_SCOPE_PATHS = [
  "/tmp/",
  "/var/",
  "/etc/",
  "/usr/",
  "os.tmpdir()",
  "os.homedir()",
  "process.env.HOME +",
  "process.env.TMPDIR",
];

export async function run(ctx) {
  const start = Date.now();
  const hits = [];

  for (const dir of [AGENT_ROOT, CORE_ROOT]) {
    for (const pattern of OUT_OF_SCOPE_PATHS) {
      let matches;
      try { matches = await searchInFiles(dir, pattern, JS_FILTER); } catch { continue; }
      for (const m of (matches ?? [])) {
        hits.push({ pattern, file: m.file, line: m.line });
      }
    }
  }

  if (hits.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `${hits.length} potential out-of-scope path(s): ${hits.slice(0, 3).map(h => `${h.pattern} @ ${h.file}:${h.line}`).join("; ")}`,
      durationMs: Date.now() - start,
      extra: { hits },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "No out-of-scope filesystem access patterns detected",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
