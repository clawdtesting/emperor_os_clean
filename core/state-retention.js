import { promises as fs } from "fs";
import { CONFIG } from "./config.js";
import { jobStatePath, listAllJobStates } from "./state.js";

const TERMINAL_RETENTION_STATUSES = new Set([
  "failed",
  "submitted",
  "completed",
  "cancelled",
  "canceled",
  "closed",
  "expired",
  "disputed"
]);

function toTimestamp(value) {
  const ts = Date.parse(String(value ?? ""));
  return Number.isFinite(ts) ? ts : 0;
}

export async function pruneStateFiles() {
  const jobs = await listAllJobStates();
  if (jobs.length === 0) return { removed: 0, reason: "no-state" };

  const nowMs = Date.now();
  const ttlMs = Math.max(0, Number(CONFIG.STATE_TTL_DAYS ?? 0)) * 24 * 60 * 60 * 1000;
  const maxFiles = Math.max(0, Number(CONFIG.MAX_STATE_FILES ?? 0));

  const terminalJobs = jobs.filter((job) =>
    TERMINAL_RETENTION_STATUSES.has(String(job.status ?? "").toLowerCase())
  );

  const toRemove = new Set();

  if (ttlMs > 0) {
    for (const job of terminalJobs) {
      const ts = toTimestamp(job.updatedAt ?? job.createdAt);
      if (!ts) continue;
      if (nowMs - ts > ttlMs) {
        toRemove.add(String(job.jobId));
      }
    }
  }

  if (maxFiles > 0 && jobs.length - toRemove.size > maxFiles) {
    const overflow = jobs.length - toRemove.size - maxFiles;
    const targetRemovalCount = toRemove.size + overflow;
    const orderedTerminal = [...terminalJobs].sort(
      (a, b) => toTimestamp(a.updatedAt ?? a.createdAt) - toTimestamp(b.updatedAt ?? b.createdAt)
    );

    for (const job of orderedTerminal) {
      if (toRemove.size >= targetRemovalCount) break;
      toRemove.add(String(job.jobId));
    }
  }

  let removed = 0;
  for (const jobId of toRemove) {
    await fs.rm(jobStatePath(jobId), { force: true });
    removed += 1;
  }

  return {
    removed,
    total: jobs.length,
    ttlDays: CONFIG.STATE_TTL_DAYS,
    maxStateFiles: CONFIG.MAX_STATE_FILES
  };
}
