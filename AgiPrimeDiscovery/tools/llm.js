#!/usr/bin/env node
/**
 * llm.js — Minimal Anthropic API client
 * Uses only built-in Node.js https module. Zero dependencies.
 *
 * Exports: chat(system, user, opts?) → Promise<string>
 * Env: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (default: claude-sonnet-4-6)
 */
"use strict";

const https = require("https");

const API_KEY = (process.env.ANTHROPIC_API_KEY || "").replace(/\s/g, "");
const MODEL   = (process.env.ANTHROPIC_MODEL   || "claude-sonnet-4-6").replace(/\s/g, "");

function chat(system, user, opts = {}) {
  const maxTokens = opts.maxTokens || 1024;
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length":    Buffer.byteLength(body),
      },
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try {
          const d = JSON.parse(Buffer.concat(chunks).toString());
          if (d.error) return reject(new Error(`Anthropic: ${d.error.message}`));
          const text = d.content?.[0]?.text || "";
          resolve(text.trim());
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error("LLM timeout")); });
    req.write(body);
    req.end();
  });
}

module.exports = { chat };
