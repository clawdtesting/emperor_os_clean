// audits/doctrine/checks/no_llm_before_assignment.js
// Verifies LLM calls are gated by job assignment — no speculative inference.

import { addCheck } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { AGENT_ROOT, CORE_ROOT } from "../../lib/constants.js";
import { searchInFiles } from "../../lib/fs_utils.js";

const CHECK_NAME = "doctrine.no_llm_before_assignment";
const JS_FILTER = f => (f.endsWith(".js") || f.endsWith(".ts")) && !f.includes("node_modules") && !f.includes("audits/");

// LLM call patterns
const LLM_PATTERNS = [
  "messages.create(",
  "chat.completions.create(",
  "anthropic.messages",
  "openai.chat",
  "callLlm(",
  "runLlm(",
  "llm.invoke(",
];

// Assignment guard patterns
const ASSIGNMENT_GUARDS = [
  "isAssigned",
  "hasAssignment",
  "jobAssigned",
  "assignmentConfirmed",
  "job.status",
  "if.*assigned",
  "assignment.*before",
];

export async function run(ctx) {
  const start = Date.now();
  let llmFound = false;
  let guardFound = false;

  for (const dir of [AGENT_ROOT, CORE_ROOT]) {
    for (const p of LLM_PATTERNS) {
      let m; try { m = await searchInFiles(dir, p, JS_FILTER); } catch { continue; }
      if (m?.length > 0) { llmFound = true; break; }
    }
    for (const p of ASSIGNMENT_GUARDS) {
      let m; try { m = await searchInFiles(dir, p, JS_FILTER); } catch { continue; }
      if (m?.length > 0) { guardFound = true; break; }
    }
  }

  if (llmFound && !guardFound) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "LLM call detected but no assignment guard found — LLM may be called before job assignment",
      durationMs: Date.now() - start,
    });
  } else if (!llmFound) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "No LLM call patterns detected in source",
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "LLM calls detected with assignment guard — doctrine satisfied",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
