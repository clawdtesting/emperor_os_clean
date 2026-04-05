// audits/static/run.js
// Static audit family — fast code/config inspection, no network required.

import { fileURLToPath } from "url";
import { buildAuditContext, addError } from "../lib/audit_context.js";
import { buildAuditReport } from "../lib/report_builder.js";
import { writeFullReport } from "../lib/result_writer.js";
import { elapsedMs } from "../lib/time_utils.js";

import * as configSanity from "./checks/config_sanity.js";
import * as doctrineEnforcement from "./checks/doctrine_enforcement.js";
import * as envContracts from "./checks/env_contracts.js";
import * as forbiddenBroadcast from "./checks/forbidden_broadcast_calls.js";
import * as forbiddenSigning from "./checks/forbidden_signing_calls.js";
import * as requiredFiles from "./checks/required_files.js";
import * as workspaceBoundary from "./checks/workspace_boundary.js";

const __filename = fileURLToPath(import.meta.url);

const CHECKS = [
  configSanity,
  doctrineEnforcement,
  envContracts,
  forbiddenBroadcast,
  forbiddenSigning,
  requiredFiles,
  workspaceBoundary,
];

export async function run(opts = {}) {
  const ctx = buildAuditContext({ ...opts, auditFamily: "static" });
  const startMs = Date.now();

  for (const check of CHECKS) {
    try {
      await check.run(ctx);
    } catch (err) {
      addError(ctx, err);
    }
  }

  const report = buildAuditReport("static", ctx.checks, ctx.metrics);
  report.elapsedMs = elapsedMs(startMs);
  report.errors = ctx.errors;
  await writeFullReport(report, "static");
  return report;
}

if (process.argv[1] === __filename) {
  run().then(r => {
    console.log(JSON.stringify(r.summary, null, 2));
    process.exit(r.status === "pass" ? 0 : 1);
  }).catch(err => {
    console.error(err.message);
    process.exit(2);
  });
}
