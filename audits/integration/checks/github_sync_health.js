// audits/integration/checks/github_sync_health.js
// Checks that the workspace git repo is in a clean, synced state.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { WORKSPACE_ROOT } from "../../lib/constants.js";
import { spawn } from "child_process";

function runProcess(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd: opts.cwd || WORKSPACE_ROOT, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", d => { stdout += d.toString(); });
    proc.stderr.on("data", d => { stderr += d.toString(); });
    proc.on("close", code => resolve({ stdout, stderr, exitCode: code, ok: code === 0 }));
    proc.on("error", reject);
  });
}

const CHECK_NAME = "integration.github_sync_health";

export async function run(ctx) {
  const start = Date.now();

  // Check git is available and we're in a repo
  let statusResult;
  try {
    statusResult = await runProcess("git", ["status", "--porcelain"], { cwd: WORKSPACE_ROOT });
  } catch (err) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `git status failed: ${err.message} — not a git repo or git not available`,
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const uncommitted = statusResult.stdout.trim();
  const uncommittedCount = uncommitted ? uncommitted.split("\n").length : 0;

  // Check if up to date with remote
  let behindResult;
  try {
    await runProcess("git", ["fetch", "--dry-run"], { cwd: WORKSPACE_ROOT });
    behindResult = await runProcess("git", ["rev-list", "--count", "HEAD..@{u}"], { cwd: WORKSPACE_ROOT });
  } catch {
    behindResult = null;
  }

  const behindBy = behindResult ? parseInt(behindResult.stdout.trim(), 10) : null;

  addMetric(ctx, "git.uncommittedFiles", uncommittedCount);
  addMetric(ctx, "git.behindRemoteBy", behindBy);

  const issues = [];
  if (uncommittedCount > 0) issues.push(`${uncommittedCount} uncommitted change(s)`);
  if (behindBy !== null && behindBy > 0) issues.push(`${behindBy} commit(s) behind remote`);

  if (issues.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `Git sync issues: ${issues.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { uncommittedCount, behindBy },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: "Git repository clean and up to date with remote",
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
