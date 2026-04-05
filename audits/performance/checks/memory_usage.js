// audits/performance/checks/memory_usage.js
// Measures current process memory usage and checks against thresholds.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";

const CHECK_NAME = "performance.memory_usage";

const WARN_HEAP_MB = 256;
const FAIL_HEAP_MB = 512;

export async function run(ctx) {
  const start = Date.now();

  const mem = process.memoryUsage();
  const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
  const rssMb = Math.round(mem.rss / 1024 / 1024);
  const externalMb = Math.round(mem.external / 1024 / 1024);

  addMetric(ctx, "memory.heapUsedMb", heapUsedMb);
  addMetric(ctx, "memory.heapTotalMb", heapTotalMb);
  addMetric(ctx, "memory.rssMb", rssMb);
  addMetric(ctx, "memory.externalMb", externalMb);

  if (heapUsedMb >= FAIL_HEAP_MB) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `Heap usage critical: ${heapUsedMb}MB (threshold: ${FAIL_HEAP_MB}MB)`,
      durationMs: Date.now() - start,
      extra: { heapUsedMb, heapTotalMb, rssMb },
    });
  } else if (heapUsedMb >= WARN_HEAP_MB) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `Heap usage elevated: ${heapUsedMb}MB (warn at ${WARN_HEAP_MB}MB)`,
      durationMs: Date.now() - start,
      extra: { heapUsedMb, heapTotalMb, rssMb },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `Memory usage normal: heap=${heapUsedMb}MB, rss=${rssMb}MB`,
      durationMs: Date.now() - start,
      extra: { heapUsedMb, heapTotalMb, rssMb },
    });
  }

  return ctx;
}
