// audits/integration/checks/file_system_permissions.js
// Checks that workspace directories exist and are readable/writable.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { WORKSPACE_ROOT, AGENT_ROOT, CORE_ROOT, ARTIFACTS_ROOT, REPORTS_DIR } from "../../lib/constants.js";
import { fileExists, ensureDir } from "../../lib/fs_utils.js";
import fs from "fs/promises";
import path from "path";

const CHECK_NAME = "integration.file_system_permissions";

const DIRS_TO_CHECK = [
  { path: WORKSPACE_ROOT, label: "workspace root", mustWrite: false },
  { path: AGENT_ROOT, label: "agent root", mustWrite: false },
  { path: CORE_ROOT, label: "core root", mustWrite: false },
  { path: ARTIFACTS_ROOT, label: "artifacts", mustWrite: true },
  { path: REPORTS_DIR, label: "reports", mustWrite: true },
];

export async function run(ctx) {
  const start = Date.now();
  const issues = [];
  let checked = 0;

  for (const dir of DIRS_TO_CHECK) {
    // Check exists
    const exists = await fileExists(dir.path);
    if (!exists) {
      if (dir.mustWrite) {
        try {
          await ensureDir(dir.path);
        } catch (err) {
          issues.push(`${dir.label} (${dir.path}): cannot create — ${err.message}`);
          continue;
        }
      } else {
        issues.push(`${dir.label} (${dir.path}): does not exist`);
        continue;
      }
    }

    // Check readable
    try {
      await fs.readdir(dir.path);
    } catch {
      issues.push(`${dir.label}: not readable`);
      continue;
    }

    // Check writable if required
    if (dir.mustWrite) {
      const testFile = path.join(dir.path, ".write_test");
      try {
        await fs.writeFile(testFile, "test");
        await fs.unlink(testFile);
      } catch {
        issues.push(`${dir.label}: not writable`);
        continue;
      }
    }

    checked++;
  }

  addMetric(ctx, "fs_permissions.checked", checked);

  if (issues.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `Filesystem issues: ${issues.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { issues },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${checked} directories accessible with correct permissions`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
