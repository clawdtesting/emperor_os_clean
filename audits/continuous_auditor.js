// audits/continuous_auditor.js
// Runs a chosen audit profile on a repeating interval.
// Usage: node audits/continuous_auditor.js [--profile fast] [--interval 60]

import { fileURLToPath } from "url";
import { runAll } from "./run_all.js";
import { nowIso, formatDuration } from "./lib/time_utils.js";
import { isValidProfile } from "./audit_profiles.js";

const __filename = fileURLToPath(import.meta.url);

const DEFAULT_INTERVAL_S = 60;
const DEFAULT_PROFILE = "fast";

function parseArgs(argv) {
  const args = {
    profile: DEFAULT_PROFILE,
    intervalS: DEFAULT_INTERVAL_S,
    strict: false,
    once: false,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--profile" && argv[i + 1]) args.profile = argv[++i];
    if (argv[i] === "--interval" && argv[i + 1]) args.intervalS = Number(argv[++i]);
    if (argv[i] === "--strict") args.strict = true;
    if (argv[i] === "--once") args.once = true;
  }
  return args;
}

let _running = false;
let _timer = null;

export async function startContinuousAudit(opts = {}) {
  if (_running) {
    console.warn("[continuous_auditor] Already running.");
    return;
  }

  const profile = opts.profile || DEFAULT_PROFILE;
  const intervalMs = (opts.intervalS || DEFAULT_INTERVAL_S) * 1000;

  if (!isValidProfile(profile)) {
    throw new Error(`Invalid profile: "${profile}"`);
  }

  _running = true;
  let runCount = 0;

  console.log(`[continuous_auditor] Starting — profile=${profile}, interval=${formatDuration(intervalMs)}`);

  async function tick() {
    if (!_running) return;
    runCount++;
    console.log(`\n[continuous_auditor] Run #${runCount} at ${nowIso()}`);

    try {
      const report = await runAll({ profile, strict: opts.strict });
      console.log(`[continuous_auditor] Run #${runCount} complete — status=${report.status}`);
    } catch (err) {
      console.error(`[continuous_auditor] Run #${runCount} error:`, err.message);
    }

    if (opts.once) {
      stopContinuousAudit();
      return;
    }

    if (_running) {
      _timer = setTimeout(tick, intervalMs);
    }
  }

  await tick();
}

export function stopContinuousAudit() {
  _running = false;
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
  console.log("[continuous_auditor] Stopped.");
}

export function isRunning() {
  return _running;
}

if (process.argv[1] === __filename) {
  const args = parseArgs(process.argv.slice(2));

  process.on("SIGINT", () => {
    console.log("\n[continuous_auditor] SIGINT received — stopping.");
    stopContinuousAudit();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    stopContinuousAudit();
    process.exit(0);
  });

  startContinuousAudit(args).catch(err => {
    console.error("[continuous_auditor] Fatal:", err.message);
    process.exit(1);
  });
}
