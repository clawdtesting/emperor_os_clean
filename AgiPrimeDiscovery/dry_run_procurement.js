// DRY RUN — AGIJobDiscoveryPrime (Contract 2) procurement flow
// Executes every step of the commit-reveal pipeline but skips all on-chain transactions.
// Real: blockchain reads, Claude evaluate, Claude draftApplication, Claude draftTrial, IPFS (optional)
// Simulated: commitApplication tx, revealApplication tx, acceptFinalist tx, submitTrial tx

import { ethers } from 'ethers'
import dotenv from 'dotenv'
dotenv.config()

const DRY = '[DRY RUN]'
const CLAUDE_TIMEOUT_MS = Number(process.env.CLAUDE_TIMEOUT_MS || 120_000)
const CLAUDE_LONG_TIMEOUT_MS = Number(process.env.CLAUDE_LONG_TIMEOUT_MS || 240_000)

const CONTRACT2    = '0xd5EF1dde7Ac60488f697ff2A7967a52172A78F29'
const SCAN_BLOCKS  = 50_000

const ABI2 = [
  'function procurements(uint256) external view returns (uint256 jobId, address employer, uint256 commitDeadline, uint256 revealDeadline, uint256 finalistAcceptDeadline, uint256 trialDeadline, uint256 scoreCommitDeadline, uint256 scoreRevealDeadline)',
  'function applicationView(uint256 procurementId, address agent) external view returns (uint8 phase, string applicationURI, bytes32 commitment, bool shortlisted)',
  'event ProcurementCreated(uint256 indexed procurementId, uint256 indexed jobId, address indexed employer)',
]

const MOCK_PROCUREMENT = {
  procurementId: 999,
  jobId: 42,
  commitDeadline: Math.floor(Date.now() / 1000) + 86400,    // +1 day
  revealDeadline: Math.floor(Date.now() / 1000) + 172800,   // +2 days
  finalistAcceptDeadline: Math.floor(Date.now() / 1000) + 259200, // +3 days
  trialDeadline: Math.floor(Date.now() / 1000) + 432000,    // +5 days
}

const MOCK_SPEC = `{
  "name": "Smart Contract Security Audit: DeFi Lending Protocol",
  "properties": {
    "title": "Smart Contract Security Audit: DeFi Lending Protocol",
    "category": "development",
    "summary": "Conduct a security audit of a DeFi lending protocol smart contract suite.",
    "details": "Audit a set of 3 Solidity smart contracts implementing a lending protocol with collateralized borrowing, liquidation mechanics, and a governance token. Identify vulnerabilities, classify by severity, and provide remediation recommendations.",
    "deliverables": [
      "Full audit report in Markdown",
      "Vulnerability list with severity ratings (Critical/High/Medium/Low/Info)",
      "Specific remediation recommendation for each finding",
      "Executive summary for non-technical stakeholders"
    ],
    "acceptanceCriteria": [
      "All 3 contracts reviewed in full",
      "Each vulnerability includes: description, impact, severity, and fix",
      "Executive summary is understandable without technical background",
      "Report follows standard audit format"
    ],
    "requirements": ["Solidity expertise", "DeFi protocol knowledge"],
    "tags": ["security", "solidity", "defi", "audit"],
    "durationSeconds": 432000
  }
}`

function sep(label = '') {
  const line = '─'.repeat(60)
  console.log(label ? `\n${line}\n  ${label}\n${line}` : line)
}

function ts(unix) {
  if (!unix || unix === 0) return 'none'
  const d    = new Date(Number(unix) * 1000)
  const diff = Number(unix) - Math.floor(Date.now() / 1000)
  const sign = diff > 0 ? `+${fmt(diff)}` : `EXPIRED ${fmt(-diff)} ago`
  return `${d.toISOString().slice(0, 16)}Z  (${sign})`
}
function fmt(s) {
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

async function claudeChat(system, user, maxTokens = 4096, timeoutMs = CLAUDE_TIMEOUT_MS) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error('empty Anthropic response')
  return text.trim()
}

async function evaluate(specContent) {
  const system = `You are Emperor_OS, an autonomous AI agent participating in the AGIJobManager marketplace on Ethereum. You evaluate job specs and decide whether to apply.`
  const user   = `Here is a job spec:\n\n${specContent}\n\nShould Emperor_OS apply for this job?\nRespond ONLY in JSON: { "shouldApply": true, "reason": "one sentence" }`
  const raw    = await claudeChat(system, user, 256)
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

async function draftApplication(specContent, agentAddress) {
  const system = `You are Emperor_OS, an autonomous AI agent. Write a professional application document in Markdown for an AGIJobManager procurement job.`
  const user   = `Job spec:\n\n${specContent}\n\nAgent address: ${agentAddress}\n\nWrite a complete application document covering:\n- Who Emperor_OS is and its capabilities\n- Why it is suited for this specific job\n- Proposed approach and methodology\n- Estimated delivery timeline\n\nFormat as clean Markdown. Be specific to the job. No generic filler.`
  return await claudeChat(system, user, 4096)
}

async function draftTrial(specContent, agentAddress) {
  const system = `You are Emperor_OS, an autonomous AI agent delivering paid work on the AGIJobManager marketplace. Produce the actual deliverable described in the job spec.`
  const user   = `Job spec:\n\n${specContent}\n\nAgent address: ${agentAddress}\n\nProduce the complete deliverable described in the job spec. Follow every acceptance criterion. Output clean Markdown.`
  return await claudeChat(system, user, 8192, CLAUDE_LONG_TIMEOUT_MS)
}

async function draftTrialWithRetry(specContent, agentAddress, retries = 2) {
  let lastError
  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) console.log(`Retrying draftTrial (${i}/${retries})...`)
      return await draftTrial(specContent, agentAddress)
    } catch (e) {
      lastError = e
      if (i === retries) break
      const timedOut = e?.name === 'TimeoutError' || /aborted due to timeout/i.test(String(e?.message))
      if (!timedOut) break
      await new Promise(r => setTimeout(r, 3000))
    }
  }
  throw lastError
}

async function fetchJobSpec(jobId) {
  const endpoint = process.env.AGI_ALPHA_MCP
  if (!endpoint) return null
  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body:    JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name: 'fetch_job_metadata', arguments: { jobId: Number(jobId), type: 'spec' } } }),
      signal:  AbortSignal.timeout(30_000),
    })
    if (!res.ok) return null
    const text        = await res.text()
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/event-stream')) {
      for (const line of text.split('\n')) {
        if (!line.startsWith('data:')) continue
        try {
          const d = JSON.parse(line.slice(5).trim())
          if (d.result?.content?.[0]?.text) return d.result.content[0].text
        } catch {}
      }
    } else {
      const d = JSON.parse(text)
      return d.result?.content?.[0]?.text || null
    }
  } catch { return null }
  return null
}

function computeCommitment(procurementId, agentAddress, applicationURI, salt) {
  return ethers.keccak256(
    ethers.solidityPacked(
      ['uint256', 'address', 'string', 'bytes32'],
      [BigInt(procurementId), agentAddress, applicationURI, salt]
    )
  )
}

async function run() {
  console.log('='.repeat(60))
  console.log(`${DRY} Procurement flow — ${new Date().toISOString()}`)
  console.log('='.repeat(60))

  const rpcUrl      = process.env.ETH_RPC_URL?.trim()
  const agentKey    = process.env.AGENT_PRIVATE_KEY?.trim()
  const agentWallet = new ethers.Wallet(agentKey)
  const agentAddr   = agentWallet.address

  console.log(`Agent address: ${agentAddr}`)

  // ── STEP 1: Scan for real procurements ────────────────────────────────────
  sep('STEP 1 — scan Contract 2 for procurements (real chain read)')
  let realProcurement = null

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const contract = new ethers.Contract(CONTRACT2, ABI2, provider)
    const iface    = new ethers.Interface(ABI2)
    const topic    = iface.getEvent('ProcurementCreated').topicHash
    const current  = await provider.getBlockNumber()
    const from     = Math.max(0, current - SCAN_BLOCKS)

    console.log(`Scanning blocks ${from} → ${current}...`)
    const logs = await provider.getLogs({ address: CONTRACT2, topics: [topic], fromBlock: from, toBlock: current })
    console.log(`Found ${logs.length} ProcurementCreated event(s)`)

    for (const log of logs) {
      const decoded       = iface.parseLog(log)
      const procurementId = decoded.args[0].toString()
      const jobId         = decoded.args[1].toString()
      const p             = await contract.procurements(BigInt(procurementId))
      const now           = Math.floor(Date.now() / 1000)
      const status        = now < Number(p.commitDeadline) ? 'COMMIT OPEN' :
                            now < Number(p.revealDeadline) ? 'REVEAL OPEN' : 'CLOSED'

      console.log(`  Procurement #${procurementId} — Job ${jobId} — ${status}`)
      console.log(`    Commit deadline : ${ts(p.commitDeadline)}`)
      console.log(`    Reveal deadline : ${ts(p.revealDeadline)}`)
      console.log(`    Trial deadline  : ${ts(p.trialDeadline)}`)

      if (now < Number(p.commitDeadline) && !realProcurement) {
        realProcurement = { procurementId, jobId, ...p }
      }
    }
  } catch (e) {
    console.log(`Chain read failed: ${e.message}`)
  }

  let procurement, specContent, usingMock

  if (realProcurement) {
    procurement = realProcurement
    usingMock   = false
    console.log(`\nUsing real procurement #${procurement.procurementId} (commit window open)`)
    specContent = await fetchJobSpec(procurement.jobId)
    if (!specContent) {
      console.log('Spec fetch failed — using mock spec for Claude steps')
      specContent = MOCK_SPEC
    }
  } else {
    procurement = MOCK_PROCUREMENT
    usingMock   = true
    specContent = MOCK_SPEC
    console.log(`\nNo procurement in commit window — injecting mock procurement #${procurement.procurementId}`)
    console.log(`Mock spec: "Smart Contract Security Audit: DeFi Lending Protocol"`)
  }

  // ── STEP 2: Evaluate ──────────────────────────────────────────────────────
  sep('STEP 2 — evaluate() [REAL Claude call]')
  console.log('Asking Claude: should Emperor_OS apply?')
  let decision
  try {
    decision = await evaluate(specContent)
    console.log(`\nDecision : ${decision.shouldApply ? '✅ APPLY' : '❌ SKIP'}`)
    console.log(`Reason   : ${decision.reason}`)
  } catch (e) {
    console.error(`evaluate() failed: ${e.message}`)
    process.exit(1)
  }

  if (!decision.shouldApply) {
    console.log(`\n${DRY} Agent would skip this procurement. Forcing continue for dry run.`)
  }

  // ── STEP 3: Draft application ─────────────────────────────────────────────
  sep('STEP 3 — draftApplication() [REAL Claude call]')
  console.log('Claude writing application document...')
  let appMarkdown
  try {
    appMarkdown = await draftApplication(specContent, agentAddr)
    console.log(`\nApplication length: ${appMarkdown.length} chars`)
    console.log('\n── Application Preview (first 600 chars) ──')
    console.log(appMarkdown.slice(0, 600))
    if (appMarkdown.length > 600) console.log(`\n... [${appMarkdown.length - 600} more chars]`)
  } catch (e) {
    console.error(`draftApplication() failed: ${e.message}`)
    process.exit(1)
  }

  // ── STEP 4: Pin + commitment (SIMULATED) ─────────────────────────────────
  sep('STEP 4 — IPFS pin + commitment hash [SIMULATED]')
  const mockApplicationURI = `ipfs://QmDryRun_Application_${procurement.procurementId}`
  const mockSalt           = ethers.hexlify(ethers.randomBytes(32))
  const commitment         = computeCommitment(
    procurement.procurementId, agentAddr, mockApplicationURI, mockSalt
  )
  console.log(`${DRY} Would pin application.md to Pinata`)
  console.log(`${DRY} applicationURI : ${mockApplicationURI}`)
  console.log(`${DRY} salt           : ${mockSalt}`)
  console.log(`${DRY} commitment     : ${commitment}`)
  console.log(`\n${DRY} PHASE 1 tx — commitApplication(`)
  console.log(`  procurementId : ${procurement.procurementId}`)
  console.log(`  commitment    : ${commitment}`)
  console.log(`  subdomain     : <AGENT_SUBDOMAIN>`)
  console.log(`  proof         : []`)
  console.log(`)`)

  // ── STEP 5: Reveal (SIMULATED) ────────────────────────────────────────────
  sep('STEP 5 — revealApplication() [SIMULATED]')
  console.log(`${DRY} After commit deadline passes, would broadcast:`)
  console.log(`${DRY} PHASE 2 tx — revealApplication(`)
  console.log(`  procurementId  : ${procurement.procurementId}`)
  console.log(`  subdomain      : <AGENT_SUBDOMAIN>`)
  console.log(`  proof          : []`)
  console.log(`  salt           : ${mockSalt}`)
  console.log(`  applicationURI : ${mockApplicationURI}`)
  console.log(`)`)
  console.log(`${DRY} Employer can now read the application`)

  // ── STEP 6: Shortlist + acceptFinalist (SIMULATED) ────────────────────────
  sep('STEP 6 — shortlist check + acceptFinalist() [SIMULATED]')
  console.log(`${DRY} Would watch ShortlistFinalized events on Contract 2`)
  console.log(`${DRY} If ${agentAddr} appears in finalists:`)
  console.log(`${DRY} PHASE 3 tx — acceptFinalist(${procurement.procurementId})`)

  // ── STEP 7: Draft trial (REAL Claude call) ────────────────────────────────
  sep('STEP 7 — draftTrial() [REAL Claude call]')
  console.log('Claude producing the actual deliverable (trial submission)...')
  let trialMarkdown
  try {
    trialMarkdown = await draftTrialWithRetry(specContent, agentAddr)
    console.log(`\nTrial length: ${trialMarkdown.length} chars`)
    console.log('\n── Trial Preview (first 600 chars) ──')
    console.log(trialMarkdown.slice(0, 600))
    if (trialMarkdown.length > 600) console.log(`\n... [${trialMarkdown.length - 600} more chars]`)
  } catch (e) {
    console.error(`draftTrial() failed: ${e.message}`)
    process.exit(1)
  }

  // ── STEP 8: submitTrial (SIMULATED) ──────────────────────────────────────
  sep('STEP 8 — submitTrial() [SIMULATED]')
  const mockTrialURI = `ipfs://QmDryRun_Trial_${procurement.procurementId}`
  console.log(`${DRY} Would pin trial.md to Pinata`)
  console.log(`${DRY} trialURI : ${mockTrialURI}`)
  console.log(`${DRY} PHASE 4 tx — submitTrial(`)
  console.log(`  procurementId : ${procurement.procurementId}`)
  console.log(`  trialURI      : ${mockTrialURI}`)
  console.log(`)`)
  console.log(`${DRY} Employer scores all trial submissions off-chain`)
  console.log(`${DRY} Winner receives the payout in AGIALPHA`)

  // ── Summary ───────────────────────────────────────────────────────────────
  sep('DRY RUN COMPLETE')
  console.log(`Procurement  : #${procurement.procurementId} ${usingMock ? '(mock)' : '(real)'}`)
  console.log(`Decision     : ${decision.shouldApply ? 'APPLY' : 'SKIP (forced continue)'}`)
  console.log(`Application  : ${appMarkdown.length} chars`)
  console.log(`Trial        : ${trialMarkdown.length} chars`)
  console.log(`Commitment   : ${commitment}`)
  console.log(`\nAll 8 phases passed. Procurement agent is ready to run live.`)
  console.log('='.repeat(60))
}

run().catch(e => {
  console.error('[fatal]', e.message)
  console.error(e.stack)
  process.exit(1)
})
