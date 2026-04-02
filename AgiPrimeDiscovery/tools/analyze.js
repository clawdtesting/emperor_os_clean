#!/usr/bin/env node
/**
 * analyze.js — Score and rank job specs using Anthropic LLM
 *
 * Stdin:  JSON array of hydrated jobs (from fetch_specs.js)
 * Stdout: JSON array of analyzed jobs sorted by score desc
 * Exit:   ALWAYS 0 — errors are embedded in the output JSON
 *
 * Env: ANTHROPIC_API_KEY, ANTHROPIC_MODEL
 */
"use strict";

const { chat } = require("./llm");

const SYSTEM = `You are a job opportunity evaluator for an autonomous AI agent.
Given a job specification, score it and return ONLY a JSON object — no markdown, no explanation:
{
  "score": 0.0,
  "recommendation": "apply|skip|review",
  "reasoning": "one sentence max",
  "feasibility": "high|medium|low"
}

Scoring (0.0 to 1.0):
- High payout in AGIALPHA → higher score
- Clear deliverables and requirements → higher score  
- Content/writing/documentation tasks → high feasibility for AI agent
- Already Completed/Assigned/Disputed → score 0.0, recommendation "skip"
- Vague, impossible, or requires physical presence → lower score`;

async function analyzeJob(job) {
  // Fast-path: skip non-actionable statuses
  if (["Completed", "Cancelled", "Expired", "Assigned"].includes(job.status)) {
    return {
      ...job,
      score: 0,
      recommendation: "skip",
      reasoning: `Status is ${job.status}`,
      feasibility: "low",
    };
  }

  const prompt = [
    `Title: ${job.title}`,
    `Status: ${job.status}`,
    `Payout: ${job.payout_agialpha} AGIALPHA`,
    `Category: ${job.category}`,
    `Summary: ${(job.summary || "").slice(0, 300)}`,
    `Deliverables: ${JSON.stringify((job.deliverables || []).slice(0, 3))}`,
  ].join("\n");

  try {
    const raw = await chat(SYSTEM, prompt, { maxTokens: 128 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error("no JSON in response");
    const result = JSON.parse(match[0]);
    return {
      ...job,
      score:          typeof result.score === "number" ? Math.min(1, Math.max(0, result.score)) : 0,
      recommendation: result.recommendation || "review",
      reasoning:      (result.reasoning || "").slice(0, 120),
      feasibility:    result.feasibility || "medium",
    };
  } catch (e) {
    process.stderr.write(`[analyze] job ${job.jobId}: ${e.message}\n`);
    return {
      ...job,
      score:          0,
      recommendation: "review",
      reasoning:      `Analysis error: ${e.message}`.slice(0, 120),
      feasibility:    "unknown",
    };
  }
}

async function main() {
  // Read stdin
  const chunks = [];
  await new Promise((resolve, reject) => {
    process.stdin.on("data", c => chunks.push(c));
    process.stdin.on("end", resolve);
    process.stdin.on("error", reject);
  });

  const raw = Buffer.concat(chunks).toString().trim();

  // Parse input — on failure return empty array, don't crash
  let jobs = [];
  try {
    const parsed = JSON.parse(raw);
    jobs = Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    process.stderr.write(`[analyze] stdin parse error: ${e.message}\n`);
    process.stdout.write("[]");
    return; // exit 0 with empty result
  }

  if (jobs.length === 0) {
    process.stdout.write("[]");
    return;
  }

  process.stderr.write(`[analyze] Analyzing ${jobs.length} jobs...\n`);

  // Check API key — warn but don't crash
  const apiKey = (process.env.ANTHROPIC_API_KEY || "").replace(/\s/g, "");
  if (!apiKey) {
    process.stderr.write("[analyze] WARNING: ANTHROPIC_API_KEY not set — returning skip for all jobs\n");
    const fallback = jobs.map(j => ({
      ...j, score: 0, recommendation: "review",
      reasoning: "No API key — manual review required", feasibility: "unknown"
    }));
    process.stdout.write(JSON.stringify(fallback));
    return;
  }

  // Analyze sequentially — avoid rate limit bursts
  const results = [];
  for (const job of jobs) {
    results.push(await analyzeJob(job));
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  process.stderr.write(`[analyze] Done — top: jobId=${results[0]?.jobId} score=${results[0]?.score} rec=${results[0]?.recommendation}\n`);
  process.stdout.write(JSON.stringify(results));
}

main().catch(e => {
  // Last-resort catch — write error to stderr, empty array to stdout, exit 0
  process.stderr.write(`[analyze] Unexpected error: ${e.message}\n`);
  process.stdout.write("[]");
});
