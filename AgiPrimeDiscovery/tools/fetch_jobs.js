#!/usr/bin/env node
/**
 * fetch_jobs.js — Fetch jobs from AGI Alpha MCP endpoint
 *
 * Stdout: JSON array of job stubs [{jobId, status, payout, specURI, ...}]
 * Env:    AGI_ALPHA_MCP, JOB_LIMIT (default: 10)
 */
"use strict";

const https = require("https");
const http  = require("http");

const ENDPOINT = (process.env.AGI_ALPHA_MCP || "").trim();
const LIMIT    = parseInt(process.env.JOB_LIMIT || "10", 10);

if (!ENDPOINT) {
  process.stderr.write("[fetch_jobs] AGI_ALPHA_MCP not set\n");
  process.exit(1);
}

function mcpCall(endpoint, toolName, args) {
  return new Promise((resolve, reject) => {
    const u    = new URL(endpoint);
    const lib  = u.protocol === "https:" ? https : http;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id:      1,
      method:  "tools/call",
      params:  { name: toolName, arguments: args },
    });

    const req = lib.request({
      hostname: u.hostname,
      port:     u.port || (u.protocol === "https:" ? 443 : 80),
      path:     u.pathname + u.search,
      method:   "POST",
      headers: {
        "Content-Type":   "application/json",
        "Accept":         "application/json, text/event-stream",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try {
          let raw = Buffer.concat(chunks).toString().trim();
          // Handle SSE framing: "event: message\ndata: {...}\n\n"
          if (raw.startsWith("event:") || raw.startsWith("data:")) {
            raw = raw.split("\n")
              .filter(l => l.startsWith("data:"))
              .map(l => l.slice(5).trim())
              .join("");
          }
          const envelope = JSON.parse(raw);
          if (envelope.error) return reject(new Error(`MCP: ${envelope.error.message}`));
          // Unwrap: result.content[0].text → JSON, or result directly
          const text = envelope?.result?.content?.[0]?.text;
          const data = text ? JSON.parse(text) : (envelope?.result ?? envelope);
          resolve(data);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("MCP timeout")); });
    req.write(body);
    req.end();
  });
}

async function main() {
  let data;
  try {
    data = await mcpCall(ENDPOINT, "list_jobs", { status: "open", limit: LIMIT });
  } catch (e) {
    process.stderr.write(`[fetch_jobs] Failed: ${e.message}\n`);
    process.exit(1);
  }

  const jobs = Array.isArray(data) ? data : (data?.jobs || data?.result || []);

  // Return all jobs — let downstream tools decide which are actionable
  process.stdout.write(JSON.stringify(jobs));
}

main().catch(e => {
  process.stderr.write(`[fetch_jobs] Fatal: ${e.message}\n`);
  process.exit(1);
});
