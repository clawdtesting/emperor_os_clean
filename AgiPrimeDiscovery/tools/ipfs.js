#!/usr/bin/env node
/**
 * ipfs.js — Pin content to IPFS via Pinata and return public URIs
 *
 * Usage:
 *   node ipfs.js --file /tmp/deliverable.md --name "My Deliverable"
 *   node ipfs.js --json '{"content":"...","filename":"deliverable.md"}'
 *   echo '{"content":"...","filename":"file.md"}' | node ipfs.js --stdin
 *
 * Stdout: JSON { cid, ipfs_uri, gateway_url, metadata_uri, metadata_cid }
 * Exit:   Always 0
 *
 * Env: PINATA_JWT
 */
"use strict";

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const PINATA_JWT     = (process.env.PINATA_JWT || "").trim();
const PINATA_API_URL = "api.pinata.cloud";

function pinataRequest(method, apiPath, body, isJson = true) {
  return new Promise((resolve, reject) => {
    const data = isJson ? JSON.stringify(body) : body;
    const req = https.request({
      hostname: PINATA_API_URL,
      path:     apiPath,
      method,
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`,
        "Content-Type":  isJson ? "application/json" : "multipart/form-data; boundary=EmpireOSBoundary",
        "Content-Length": Buffer.byteLength(data),
      },
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString());
          if (res.statusCode >= 400) reject(new Error(`Pinata ${res.statusCode}: ${JSON.stringify(parsed)}`));
          else resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("Pinata timeout")); });
    req.write(data);
    req.end();
  });
}

function pinFile(content, filename) {
  // Multipart upload via Pinata's pinFileToIPFS
  const boundary = "EmpireOSBoundary";
  const fileContent = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");

  const parts = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`,
    `Content-Type: text/plain\r\n\r\n`,
  ].join("");

  const end = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([
    Buffer.from(parts),
    fileContent,
    Buffer.from(end),
  ]);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: PINATA_API_URL,
      path:     "/pinning/pinFileToIPFS",
      method:   "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`,
        "Content-Type":  `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString());
          if (res.statusCode >= 400) reject(new Error(`Pinata ${res.statusCode}: ${JSON.stringify(parsed)}`));
          else resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("Pinata timeout")); });
    req.write(body);
    req.end();
  });
}

function pinJson(json) {
  return pinataRequest("POST", "/pinning/pinJSONToIPFS", json);
}

async function main() {
  if (!PINATA_JWT) {
    process.stderr.write("[ipfs] PINATA_JWT not set\n");
    process.stdout.write(JSON.stringify({ error: "PINATA_JWT not set" }));
    return;
  }

  // Read input
  const args = process.argv.slice(2);
  let writerOutput;

  if (args.includes("--stdin")) {
    const chunks = [];
    await new Promise((resolve, reject) => {
      process.stdin.on("data", c => chunks.push(c));
      process.stdin.on("end", resolve);
      process.stdin.on("error", reject);
    });
    writerOutput = JSON.parse(Buffer.concat(chunks).toString().trim());
  } else if (args.includes("--json")) {
    writerOutput = JSON.parse(args[args.indexOf("--json") + 1]);
  } else {
    process.stderr.write("[ipfs] Provide --stdin or --json\n");
    process.stdout.write(JSON.stringify({ error: "no input" }));
    return;
  }

  if (!writerOutput.content) {
    process.stderr.write("[ipfs] No content to pin\n");
    process.stdout.write(JSON.stringify({ error: "no content in writer output" }));
    return;
  }

  const { content, filename, jobId, title } = writerOutput;

  process.stderr.write(`[ipfs] Pinning deliverable: ${filename}\n`);

  // Step 1: Pin the deliverable file
  let fileResult;
  try {
    fileResult = await pinFile(content, filename);
    process.stderr.write(`[ipfs] File pinned: ${fileResult.IpfsHash}\n`);
  } catch (e) {
    process.stderr.write(`[ipfs] File pin failed: ${e.message}\n`);
    process.stdout.write(JSON.stringify({ error: e.message }));
    return;
  }

  const fileCid     = fileResult.IpfsHash;
  const fileUri     = `ipfs://${fileCid}`;
  const gatewayUrl  = `https://ipfs.io/ipfs/${fileCid}`;

  // Step 2: Build and pin completion metadata JSON
  // AGIJobManager completion metadata format
  const metadata = {
    name:        `Job #${jobId} Completion — ${title}`,
    description: `Deliverable for AGI Alpha Job #${jobId}: ${title}`,
    image:       fileUri,               // ← validators check this field
    external_url: gatewayUrl,
    attributes: [
      { trait_type: "Job ID",   value: String(jobId) },
      { trait_type: "Agent",    value: process.env.ENS_SUBDOMAIN || "lobster0.alpha.agent.agi.eth" },
      { trait_type: "Filename", value: filename },
    ],
    content_uri:  fileUri,
    completed_at: new Date().toISOString(),
  };

  let metaResult;
  try {
    metaResult = await pinJson(metadata);
    process.stderr.write(`[ipfs] Metadata pinned: ${metaResult.IpfsHash}\n`);
  } catch (e) {
    process.stderr.write(`[ipfs] Metadata pin failed: ${e.message}\n`);
    // Still return file info even if metadata pin failed
    process.stdout.write(JSON.stringify({
      jobId,
      file_cid:    fileCid,
      file_uri:    fileUri,
      gateway_url: gatewayUrl,
      metadata_error: e.message,
    }));
    return;
  }

  const metaCid = metaResult.IpfsHash;
  const result = {
    jobId,
    title,
    filename,
    file_cid:        fileCid,
    file_uri:        fileUri,
    gateway_url:     gatewayUrl,
    metadata_cid:    metaCid,
    metadata_uri:    `ipfs://${metaCid}`,
    metadata_gateway: `https://ipfs.io/ipfs/${metaCid}`,
    completion_uri:  `ipfs://${metaCid}`,  // ← this is what goes on-chain
    pinned_at:       new Date().toISOString(),
  };

  process.stdout.write(JSON.stringify(result));
  process.stderr.write(`[ipfs] Done — completion URI: ipfs://${metaCid}\n`);
}

main().catch(e => {
  process.stderr.write(`[ipfs] Unexpected error: ${e.message}\n`);
  process.stdout.write(JSON.stringify({ error: e.message }));
});
