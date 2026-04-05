// audits/artifact/checks/artifact_uri_resolution.js
// Checks that IPFS URIs in artifacts are well-formed (CIDv0/CIDv1).

import { addCheck, addMetric } from "../../lib/audit_context.js";
import { SEVERITY } from "../../lib/severity.js";
import { ARTIFACTS_ROOT } from "../../lib/constants.js";
import { listFiles, readJson } from "../../lib/fs_utils.js";

const CHECK_NAME = "artifact.artifact_uri_resolution";

// CIDv0 starts with Qm (base58, 46 chars); CIDv1 starts with bafy / bafk
const CID_REGEX = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{55,}|bafk[a-z2-7]{55,})$/;

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
      details: "Artifacts directory not accessible — URI check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  if (files.length === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: "No artifacts found — URI resolution check skipped",
      durationMs: Date.now() - start,
    });
    return ctx;
  }

  const invalid = [];
  const noUri = [];
  let valid = 0;

  for (const file of files) {
    let data;
    try { data = await readJson(file); } catch { continue; }

    const uri = data.ipfsHash || data.ipfsUri || data.uri;
    if (!uri) {
      noUri.push(file);
      continue;
    }

    // Strip ipfs:// prefix if present
    const cid = uri.replace(/^ipfs:\/\//, "");
    if (!CID_REGEX.test(cid)) {
      invalid.push(`${file}: invalid CID "${cid}"`);
    } else {
      valid++;
    }
  }

  addMetric(ctx, "uri_resolution.valid", valid);
  addMetric(ctx, "uri_resolution.invalid", invalid.length);

  if (invalid.length > 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.FAIL,
      severity: SEVERITY.FAIL,
      details: `${invalid.length} malformed IPFS URI(s): ${invalid.slice(0, 3).join("; ")}`,
      durationMs: Date.now() - start,
      extra: { invalid },
    });
  } else if (valid === 0) {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.WARN,
      severity: SEVERITY.WARN,
      details: `${noUri.length} artifact(s) have no IPFS URI — URI resolution not verifiable`,
      durationMs: Date.now() - start,
    });
  } else {
    addCheck(ctx, {
      name: CHECK_NAME,
      status: SEVERITY.PASS,
      severity: SEVERITY.PASS,
      details: `All ${valid} IPFS URI(s) are well-formed CIDs`,
      durationMs: Date.now() - start,
    });
  }

  return ctx;
}
