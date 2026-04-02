// EmpireOS — Autonomous AGI Alpha Job Loop
// Fully autonomous: discover → score → apply → work → submit
// One LLM call per job. No gates. No human approval.

import { callMcp } from './mcp.js'
import { scoreJob } from './score.js'
import { doWork }   from './work.js'
import { submitCompletion } from './submit.js'
import { broadcastMcpTx, address } from './chain.js'

const ENS = process.env.ENS_SUBDOMAIN
const MAX_ACTIVE = 3

async function run() {
  console.log('='.repeat(60))
  console.log(`[emperor] starting — agent: ${ENS} — ${new Date().toISOString()}`)

  if (!ENS) throw new Error('ENS_SUBDOMAIN not set')
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
  if (!process.env.WALLET_PRIVATE_KEY) throw new Error('WALLET_PRIVATE_KEY not set')
  if (!process.env.PINATA_JWT) throw new Error('PINATA_JWT not set')

  // 1. List all jobs
  console.log('[loop] calling list_jobs...')
  const jobs = await callMcp('list_jobs', {})
  console.log(`[loop] list_jobs raw type: ${typeof jobs}, isArray: ${Array.isArray(jobs)}`)
  if (!Array.isArray(jobs)) throw new Error(`list_jobs returned unexpected: ${JSON.stringify(jobs).slice(0, 200)}`)

  const open = jobs.filter(j => j.status === 'Open')
  console.log(`[loop] jobs: ${jobs.length} total, ${open.length} open`)

  if (open.length === 0) {
    console.log('[loop] no open jobs — done')
    return
  }

  // Wallet only needed when there are open jobs to potentially apply for
  const myAddress = address()
  console.log(`[loop] wallet address: ${myAddress}`)

  const active = jobs.filter(j => j.status === 'Assigned' && j.assignedAgent?.toLowerCase() === myAddress.toLowerCase())
  console.log(`[loop] active (mine): ${active.length}`)

  if (active.length >= MAX_ACTIVE) {
    console.log(`[loop] at max active jobs (${MAX_ACTIVE}) — done`)
    return
  }

  // 2. Score each open job
  const candidates = []

  for (const job of open) {
    process.stdout.write(`[score] job ${job.jobId} (${job.payout})... `)

    let spec = null
    try {
      spec = await callMcp('fetch_job_metadata', { jobId: job.jobId, type: 'spec' })
    } catch (e) {
      console.log(`spec fetch failed: ${e.message}`)
      continue
    }

    const result = scoreJob(job, spec)
    console.log(`${result.score} — ${result.reason}`)

    if (result.pass) candidates.push({ job, spec, score: result })
  }

  if (candidates.length === 0) {
    console.log('[loop] no jobs pass scoring — done')
    return
  }

  // Pick highest scoring job
  candidates.sort((a, b) => b.score.score - a.score.score)
  const { job, spec, score } = candidates[0]

  console.log(`[loop] target → job ${job.jobId} | ${job.payout} | score ${score.score} | category: ${score.category}`)

  // 3. Apply on-chain
  console.log(`[apply] applying for job ${job.jobId}...`)
  let applyResult
  try {
    applyResult = await callMcp('apply_for_job', { jobId: job.jobId, ensSubdomain: ENS })
  } catch (e) {
    console.log(`[apply] failed: ${e.message}`)
    return
  }

  try {
    await broadcastMcpTx(applyResult)
    console.log(`[apply] ✓ applied for job ${job.jobId}`)
  } catch (e) {
    console.log(`[apply] tx failed: ${e.message}`)
    return
  }

  // 4. Do the work (one Claude call)
  console.log(`[work] executing job ${job.jobId}...`)
  let workResult
  try {
    workResult = await doWork(job.jobId, spec)
  } catch (e) {
    console.error(`[work] failed: ${e.message}`)
    // Work failed — job is assigned to us but we can't complete it
    // Log and exit — do not leave silently
    notify(`⚠️ Job ${job.jobId} work failed: ${e.message}`)
    return
  }

  // 5. Submit
  console.log(`[submit] submitting job ${job.jobId}...`)
  let submission
  try {
    submission = await submitCompletion(job.jobId, job, spec, workResult)
  } catch (e) {
    console.error(`[submit] failed: ${e.message}`)
    notify(`⚠️ Job ${job.jobId} submit failed: ${e.message}`)
    return
  }

  console.log('='.repeat(60))
  console.log(`[done] ✓ job ${job.jobId} complete`)
  console.log(`[done] deliverable: ${submission.deliverableUri}`)
  console.log(`[done] completion:  ${submission.completionUri}`)
  console.log(`[done] tx hash:     ${submission.txHash}`)
  console.log('='.repeat(60))

  // 6. Notify (non-blocking, best-effort)
  const title = spec?.properties?.title || `Job ${job.jobId}`
  const expectedPayout = (score.payout * 0.6).toLocaleString()
  notify(
    `✅ Job ${job.jobId} submitted\n` +
    `📋 ${title}\n` +
    `💰 Expected: ${expectedPayout} AGIALPHA\n` +
    `🔗 ${submission.completionUri}\n` +
    `⛓️ ${submission.txHash}`
  )
}

async function notify(msg) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chat  = process.env.TELEGRAM_CHAT_ID
  if (!token || !chat) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: msg, parse_mode: 'HTML' })
    })
  } catch {}
}

run().catch(e => {
  console.error('[fatal]', e.message)
  console.error('[stack]', e.stack)
  process.exit(1)
})
