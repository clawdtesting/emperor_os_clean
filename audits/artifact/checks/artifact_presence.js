// audits/artifact/checks/artifact_presence.js
// Confirms required artifact files exist in the artifacts directory.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, fileExists } from "../../lib/fs_utils.js";

const CHECK_NAME = "artifact.artifact_presence";

export async function run(ctx) {
  const start = Date.now();

  let files;
  try {
    files = await listFiles(ARTIFACTS_ROOT, f => f.endsWith(".json"));
  } catch {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "Artifacts directory does not exist or is not accessible",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  addMetric(ctx, "artifact_presence.count", files.length);

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No artifact files found in artifacts directory",
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `${files.length} artifact file(s) present in ${ARTIFACTS_ROOT}`,
      durationMs: Date.now() - start,
      extra: { count: files.length },
    });
  }

  return ctx;
}
