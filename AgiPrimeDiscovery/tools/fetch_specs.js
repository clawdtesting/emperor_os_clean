#!/usr/bin/env node
/**
 * fetch_specs.js — Hydrate job stubs with full specs from specURI (IPFS/HTTPS)
 *
 * Stdin:  JSON array of job stubs [{jobId, specURI, payout, status, ...}]
 * Stdout: JSON array of hydrated jobs [{...stub, spec: {...}, title, payout_raw}]
 *
 * Env: IPFS_GATEWAY (default: https://ipfs.io/ipfs/)
 */
"use strict";

const https = require("https");
const http  = require("http");

const GATEWAY     = (process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs/").replace(/\/?$/, "/");
const CONCURRENCY = 3;
const TIMEOUT_MS  = 20000;

function resolveUri(uri) {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) return GATEWAY + uri.slice(7);
  if (uri.startsWith("http"))    return uri;
  return null;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const u   = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.get(url, { timeout: TIMEOUT_MS }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

async function hydrateStub(stub) {
  const url = resolveUri(stub.specURI);
  if (!url) return { ...stub, spec: null, _error: "no specURI" };

  try {
    const spec  = await fetchJson(url);
    const props = spec.properties || {};
    return {
      jobId:       stub.jobId,
      status:      stub.status,
      payout_raw:  stub.payout,
      specURI:     stub.specURI,
      employer:    stub.employer,
      title:       props.title || spec.name || "Untitled",
      category:    props.category || "",
      summary:     props.summary || spec.description || "",
      deliverables: props.deliverables || [],
      requirements: props.requirements || [],
      payout_agialpha: parseInt(props.payoutAGIALPHA || "0", 10) || 0,
      duration_seconds: props.durationSeconds || 0,
      contract:    props.contract || "",
      chain_id:    props.chainId || 1,
      spec,
    };
  } catch (e) {
    process.stderr.write(`[fetch_specs] ${stub.jobId}: ${e.message}\n`);
    return { ...stub, spec: null, _error: e.message };
  }
}

async function main() {
  const chunks = [];
  process.stdin.on("data", c => chunks.push(c));
  process.stdin.on("end", async () => {
    let stubs;
    try {
      stubs = JSON.parse(Buffer.concat(chunks).toString());
      if (!Array.isArray(stubs)) stubs = [stubs];
    } catch (e) {
      process.stderr.write(`[fetch_specs] Invalid stdin: ${e.message}\n`);
      process.stdout.write("[]");
      process.exit(1);
    }

    if (stubs.length === 0) { process.stdout.write("[]"); return; }

    const results = [];
    for (let i = 0; i < stubs.length; i += CONCURRENCY) {
      const batch = await Promise.all(stubs.slice(i, i + CONCURRENCY).map(hydrateStub));
      results.push(...batch);
    }

    const ok = results.filter(r => !r._error).length;
    process.stderr.write(`[fetch_specs] ${ok}/${stubs.length} specs fetched\n`);
    process.stdout.write(JSON.stringify(results));
  });
}

main().catch(e => {
  process.stderr.write(`[fetch_specs] Fatal: ${e.message}\n`);
  process.exit(1);
});
