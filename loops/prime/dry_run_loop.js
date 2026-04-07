// DRY RUN — AGIJobManager loop
// Executes every step of the real loop but skips all on-chain transactions.
// Real: MCP calls, scoring, Claude work, IPFS pinning
// Simulated: apply_for_job tx, request_job_completion tx

import { callMcp }   from './mcp.js'
import { scoreJob }  from '../../agent/score.js'
import { doWork }    from '../../agent/work.js'

const DRY = '[DRY RUN]'

const MOCK_JOB = {
  jobId:         999,
  status:        'Open',
  payout:        '2500',
  specURI:       'ipfs://mock',
  assignedAgent: null,
}

const MOCK_SPEC = {
  name: 'Market Analysis: Ethereum Layer 2 Landscape Q2 2026',
  properties: {
    title:    'Market Analysis: Ethereum Layer 2 Landscape Q2 2026',
    category: 'research',
    summary:  'Comprehensive research report on the current state of Ethereum L2 solutions.',
    details:  'Produce a detailed market analysis covering the top Ethereum Layer 2 solutions (Arbitrum, Optimism, Base, zkSync, Polygon). Include TVL trends, fee comparisons, ecosystem growth, and a forward-looking outlook for Q3 2026.',
    deliverables: [
      'Executive summary (300–500 words)',
      'TVL and fee comparison table for top 5 L2s',
      'Ecosystem growth analysis per network',
      'Q3 2026 outlook and recommendations',
    ],
    acceptanceCriteria: [
      'Covers at least 5 L2 networks by name with current TVL data',
      'Includes a comparison table with at least 4 metrics',
      'Minimum 800 words total',
      'Includes a forward-looking section with at least 3 specific predictions',
    ],
    requirements: ['Cite data sources', 'Use Markdown formatting'],
    tags:         ['ethereum', 'layer2', 'defi', 'research'],
    durationSeconds: 259200,
  },
}

function sep(label = '') {
  const line = '─'.repeat(60)
  console.log(label ? `\n${line}\n  ${label}\n${line}` : line)
}

async function run() {
  console.log('='.repeat(60))
  console.log(`${DRY} AGIJobManager loop — ${new Date().toISOString()}`)
  console.log('='.repeat(60))

  // ── STEP 1: List jobs ──────────────────────────────────────────────────────
  sep('STEP 1 — list_jobs (real MCP call)')
  let jobs = []
  try {
    jobs = await callMcp('list_jobs', {})
    console.log(`Found ${jobs.length} jobs total`)
  } catch (e) {
    console.log(`MCP call failed: ${e.message}`)
    console.log('Continuing with mock data...')
  }

  const open = jobs.filter(j => j.status === 'Open')
  console.log(`Open jobs: ${open.length}`)

  let job, spec

  if (open.length > 0) {
    // ── STEP 2a: Fetch real spec ─────────────────────────────────────────────
    sep('STEP 2 — fetch_job_metadata (real MCP call)')
    job = open[0]
    console.log(`Using real job ${job.jobId} | payout: ${job.payout}`)
    try {
      spec = await callMcp('fetch_job_metadata', { jobId: job.jobId, type: 'spec' })
      console.log('Spec fetched:')
      console.log(JSON.stringify(spec, null, 2).slice(0, 500) + '...')
    } catch (e) {
      console.log(`Spec fetch failed: ${e.message} — using mock spec`)
      spec = MOCK_SPEC
    }
  } else {
    // ── STEP 2b: Inject mock job ─────────────────────────────────────────────
    sep('STEP 2 — no open jobs, injecting mock job')
    job  = MOCK_JOB
    spec = MOCK_SPEC
    console.log(`Mock job ${job.jobId} | payout: ${job.payout} AGIALPHA`)
    console.log(`Mock spec: "${spec.properties.title}"`)
  }

  // ── STEP 3: Score ──────────────────────────────────────────────────────────
  sep('STEP 3 — scoreJob() [deterministic, no LLM]')
  const score = scoreJob(job, spec)
  console.log(`Score    : ${score.score}`)
  console.log(`Category : ${score.category}`)
  console.log(`Payout   : ${score.payout} AGIALPHA`)
  console.log(`Pass     : ${score.pass}`)
  console.log(`Reason   : ${score.reason}`)

  if (!score.pass) {
    console.log(`\n${DRY} Job would be SKIPPED (score below threshold). Forcing continue for dry run.`)
  }

  // ── STEP 4: Apply (SIMULATED) ──────────────────────────────────────────────
  sep('STEP 4 — apply_for_job [SIMULATED — no tx sent]')
  console.log(`${DRY} Would call MCP: apply_for_job({ jobId: ${job.jobId}, ensSubdomain: <ENS_SUBDOMAIN> })`)
  console.log(`${DRY} Would broadcast:`)
  console.log(`  Tx 1: ERC20.approve(AGIJobManager, 1000 AGIALPHA)  — bond`)
  console.log(`  Tx 2: AGIJobManager.applyForJob(${job.jobId}, "<ENS_SUBDOMAIN>")`)
  console.log(`${DRY} ✓ apply step skipped`)

  // ── STEP 5: Do the work (REAL Claude call) ─────────────────────────────────
  sep('STEP 5 — doWork() [REAL Claude API call]')
  console.log(`Category: ${score.category}`)
  console.log('Calling Claude...')
  let workResult
  try {
    workResult = await doWork(job.jobId, spec)
    console.log(`\nDeliverable file : ${workResult.filename}`)
    console.log(`Mime type        : ${workResult.mimeType}`)
    console.log(`Content length   : ${workResult.content.length} chars`)
    console.log(`\n── Summary ──`)
    console.log(workResult.summary)
    console.log(`\n── Validator Note ──`)
    console.log(workResult.validatorNote)
    console.log(`\n── Deliverable Preview (first 800 chars) ──`)
    console.log(workResult.content.slice(0, 800))
    if (workResult.content.length > 800) console.log(`\n... [${workResult.content.length - 800} more chars]`)
  } catch (e) {
    console.error(`Work failed: ${e.message}`)
    process.exit(1)
  }

  // ── STEP 6: Submit (SIMULATED) ─────────────────────────────────────────────
  sep('STEP 6 — submitCompletion() [SIMULATED — no IPFS pin, no tx]')
  console.log(`${DRY} Would pin deliverable to Pinata: ${workResult.filename}`)
  console.log(`${DRY} Would get: ipfs://Qm<deliverable_hash>`)
  console.log(`${DRY} Would build completion metadata JSON`)
  console.log(`${DRY} Would pin completion metadata: ipfs://Qm<completion_hash>`)
  console.log(`${DRY} Would call MCP: request_job_completion({ jobId: ${job.jobId}, completionURI: "ipfs://..." })`)
  console.log(`${DRY} Would broadcast: AGIJobManager.requestJobCompletion(${job.jobId}, "ipfs://...")`)
  console.log(`${DRY} ✓ submit step skipped`)

  // ── STEP 7: Telegram notification (SIMULATED) ─────────────────────────────
  sep('STEP 7 — Telegram notification [SIMULATED]')
  const title = spec?.properties?.title || `Job ${job.jobId}`
  const expectedPayout = (score.payout * 0.6).toLocaleString()
  console.log(`${DRY} Would send:`)
  console.log(`  ✅ Job ${job.jobId} submitted`)
  console.log(`  📋 ${title}`)
  console.log(`  💰 Expected: ${expectedPayout} AGIALPHA (60% payout tier)`)
  console.log(`  🔗 ipfs://<completion_hash>`)
  console.log(`  ⛓️  0x<tx_hash>`)

  // ── Summary ────────────────────────────────────────────────────────────────
  sep('DRY RUN COMPLETE')
  console.log(`Job         : ${job.jobId} ${open.length > 0 ? '(real)' : '(mock)'}`)
  console.log(`Title       : ${title}`)
  console.log(`Score       : ${score.score} | Category: ${score.category}`)
  console.log(`Deliverable : ${workResult.filename} (${workResult.content.length} chars)`)
  console.log(`\nAll steps passed. Ready to run autonomously.`)
  console.log('='.repeat(60))
}

run().catch(e => {
  console.error('[fatal]', e.message)
  console.error(e.stack)
  process.exit(1)
})
