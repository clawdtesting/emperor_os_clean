// audits/run_all.js
// Master audit runner. Discovers enabled families and runs them sequentially.
// Usage: node audits/run_all.js [--profile fast|full|presign|runtime] [--family static]

import { fileURLToPath } from "url";
import path from "path";
import { getProfile, DEFAULT_PROFILE, isValidProfile } from "./audit_profiles.js";
import { getAuditRunnerPath, isBlockingAudit } from "./lib/audit_registry.js";
import { buildMasterReport } from "./lib/report_builder.js";
import { writeFullReport } from "./lib/result_writer.js";
import { nowIso, elapsedMs } from "./lib/time_utils.js";
import { SEVERITY, shouldBlockExecution } from "./lib/severity.js";

const __filename = fileURLToPath(import.meta.url);

// ── CLI argument parsing ───────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { profile: DEFAULT_PROFILE, family: null, strict: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--profile" && argv[i + 1]) args.profile = argv[++i];
    if (argv[i] === "--family" && argv[i + 1]) args.family = argv[++i];
    if (argv[i] === "--strict") args.strict = true;
  }
  return args;
}

// ── Run a single family ────────────────────────────────────────────────────

async function runFamily(family, opts) {
  const runnerPath = getAuditRunnerPath(family);
  try {
    const mod = await import(runnerPath);
    if (typeof mod.run !== "function") {
      return { family, status: "error", error: "No run() export found", checks: [], metrics: {} };
    }
    const report = await mod.run(opts);
    return report;
  } catch (err) {
    return {
      family,
      status: "error",
      error: err.message,
      checks: [],
      metrics: {},
      summary: { pass: 0, warn: 0, fail: 0, critical: 0, total: 0 },
    };
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

export async function runAll(opts = {}) {
  const profileName = opts.profile || DEFAULT_PROFILE;
  if (!isValidProfile(profileName)) {
    throw new Error(`Invalid profile: ${profileName}`);
  }

  const profile = getProfile(profileName);
  const families = opts.family
    ? [opts.family]
    : profile.families;

  const startMs = Date.now();
  console.log(`\n[run_all] Profile: ${profileName} | Families: ${families.join(", ")}`);
  console.log(`[run_all] Started: ${nowIso()}\n`);

  const results = [];
  let aborted = false;

  for (const family of families) {
    if (aborted) {
      results.push({ family, status: "skipped", checks: [], metrics: {}, summary: { pass: 0, warn: 0, fail: 0, critical: 0, total: 0 } });
      continue;
    }

    process.stdout.write(`  → ${family.padEnd(14)} `);
    const t = Date.now();

    const report = await runFamily(family, { ...opts, profile: profileName });
    const elapsed = elapsedMs(t);

    const statusStr = report.status || "unknown";
    console.log(`${statusStr.toUpperCase().padEnd(8)} (${elapsed}ms)`);

    results.push(report);

    if (profile.stopOnFirstCritical && isBlockingAudit(family)) {
      if (shouldBlockExecution(report.summary?.worstSeverity || SEVERITY.PASS)) {
        console.log(`\n[run_all] CRITICAL failure in blocking family "${family}" — aborting.`);
        aborted = true;
      }
    }
  }

  const master = buildMasterReport(results);
  master.profile = profileName;
  master.elapsedMs = elapsedMs(startMs);
  master.aborted = aborted;

  await writeFullReport(master, "master");

  console.log(`\n[run_all] Done in ${master.elapsedMs}ms`);
  console.log(`[run_all] Status: ${master.status?.toUpperCase()}`);
  if (master.summary) {
    const s = master.summary;
    console.log(`[run_all] pass=${s.pass} warn=${s.warn} fail=${s.fail} critical=${s.critical}\n`);
  }

  return master;
}

// ── CLI entry ──────────────────────────────────────────────────────────────

if (process.argv[1] === __filename) {
  const args = parseArgs(process.argv.slice(2));
  runAll(args).then(report => {
    const bad = shouldBlockExecution(report.summary?.worstSeverity || SEVERITY.PASS);
    process.exit(bad ? 1 : 0);
  }).catch(err => {
    console.error("[run_all] Fatal:", err.message);
    process.exit(2);
  });
}
