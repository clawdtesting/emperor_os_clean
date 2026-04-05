// audits/determinism/checks/normalized_input_consistency.js
// Verifies that normalizing the same input twice yields identical output.

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { normalizeAddress } from "../../lib/abi_utils.js";
import { sha256Json } from "../../lib/hash_utils.js";
import { deepEqual } from "../../lib/json_utils.js";

const CHECK_NAME = "determinism.normalized_input_consistency";

// Test vectors: [input, expected behavior]
const ADDRESS_TEST_VECTORS = [
  "0xB3AAeb69b630f0299791679c063d68d6687481d1",
  "0xd5EF1dde7Ac60488f697ff2A7967a52172A78F29",
  "0xA61a3B3a130a9c20768EEBF97E21515A6046a1fA",
  "0x0000000000000000000000000000000000000001",
];

const JSON_TEST_VECTORS = [
  { jobId: 1, result: "test", nested: { a: 1, b: [2, 3] } },
  { jobId: 42, reward: "1000000000000000000", createdAt: "2024-01-01T00:00:00.000Z" },
];

export async function run(ctx) {
  const start = Date.now();
  const failures = [];

  // Test address normalization is idempotent
  for (const addr of ADDRESS_TEST_VECTORS) {
    const n1 = normalizeAddress(addr);
    const n2 = normalizeAddress(addr);
    const n3 = normalizeAddress(n1); // normalize the normalized
    if (n1 !== n2) failures.push(`normalizeAddress not deterministic for ${addr}`);
    if (n1 !== n3) failures.push(`normalizeAddress not idempotent for ${addr}`);
  }

  // Test sha256Json is deterministic across multiple calls
  for (const obj of JSON_TEST_VECTORS) {
    const h1 = sha256Json(obj);
    const h2 = sha256Json(obj);
    const h3 = sha256Json(JSON.parse(JSON.stringify(obj)));
    if (h1 !== h2) failures.push(`sha256Json not deterministic for ${JSON.stringify(obj)}`);
    if (h1 !== h3) failures.push(`sha256Json not stable across re-serialized copy`);
  }

  // Test deepEqual is consistent
  const a = { x: 1, y: [1, 2, 3] };
  const b = { x: 1, y: [1, 2, 3] };
  if (!deepEqual(a, b)) failures.push("deepEqual(a,b) returned false for equal objects");
  if (!deepEqual(b, a)) failures.push("deepEqual is not symmetric");

  addMetric(ctx, "input_consistency.vectors_tested", ADDRESS_TEST_VECTORS.length + JSON_TEST_VECTORS.length);

  if (failures.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.CRITICAL,
      severity: SEVERITY.CRITICAL,
      details: `Normalization inconsistency: ${failures.join("; ")}`,
      durationMs: Date.now() - start,
      extra: { failures },
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All normalization functions are deterministic and idempotent`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
