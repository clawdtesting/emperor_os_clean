/**
 * test_mainnet/run.js
 * Live mainnet test: createJob on Contract 1 (AGIJobManager) → createProcurement on Contract 2 (AGIJobDiscoveryPrime)
 *
 * Run from the agent/ directory:
 *   node ../tests/test_mainnet/run.js
 *
 * Required env vars:
 *   ETH_RPC_URL          Ethereum mainnet RPC (e.g. https://eth.llamarpc.com)
 *   WALLET_PRIVATE_KEY   Employer wallet private key
 *   AGI_ALPHA_MCP        AGI Alpha MCP endpoint URL
 *
 * Optional env vars:
 *   COMMIT_DURATION      Procurement commit phase, seconds (default: 2 days)
 *   REVEAL_DURATION      Reveal phase, seconds (default: 1 day)
 *   FINALIST_ACCEPT_DUR  Finalist accept phase, seconds (default: 1 day)
 *   TRIAL_DURATION       Trial phase, seconds (default: 3 days)
 *   SCORE_COMMIT_DUR     Score commit phase, seconds (default: 1 day)
 *   SCORE_REVEAL_DUR     Score reveal phase, seconds (default: 1 day)
 */

import { ethers } from 'ethers'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const DIR = join(dirname(fileURLToPath(import.meta.url)))

// ── Config ────────────────────────────────────────────────────────────────────

const JOB_SPEC_CID = 'QmcZErDbkCECXwNnW89dgCXxR8LE4mWf4LN3uoXX2Z4e3K'
const JOB_SPEC_URI = `ipfs://${JOB_SPEC_CID}`

const CONTRACT1 = '0xB3AAeb69b630f0299791679c063d68d6687481d1'   // AGIJobManager
const CONTRACT2 = '0xd5EF1dde7Ac60488f697ff2A7967a52172A78F29'   // AGIJobDiscoveryPrime

// Procurement phase durations (seconds) — override via env
const COMMIT_DURATION         = Number(process.env.COMMIT_DURATION)         || 2 * 86400   // 2 days
const REVEAL_DURATION         = Number(process.env.REVEAL_DURATION)         || 1 * 86400   // 1 day
const FINALIST_ACCEPT_DUR     = Number(process.env.FINALIST_ACCEPT_DUR)     || 1 * 86400   // 1 day
const TRIAL_DURATION          = Number(process.env.TRIAL_DURATION)          || 3 * 86400   // 3 days
const SCORE_COMMIT_DUR        = Number(process.env.SCORE_COMMIT_DUR)        || 1 * 86400   // 1 day
const SCORE_REVEAL_DUR        = Number(process.env.SCORE_REVEAL_DUR)        || 1 * 86400   // 1 day

// Contract 1: JobCreated event (used to extract jobId from receipt)
const ABI1 = [
  'event JobCreated(uint256 indexed jobId, address indexed employer)',
]

// Contract 2: employer-facing createProcurement
// NOTE: If this reverts with a decoding error, the function signature below may differ.
// Verify against: https://etherscan.io/address/0xd5ef1dde7ac60488f697ff2a7967a52172a78f29#writeContract
const ABI2 = [
  'function createProcurement(uint256 jobId, uint256 commitDuration, uint256 revealDuration, uint256 finalistAcceptDuration, uint256 trialDuration, uint256 scoreCommitDuration, uint256 scoreRevealDuration) external',
  'event ProcurementCreated(uint256 indexed procurementId, uint256 indexed jobId, address indexed employer)',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWallet() {
  if (!process.env.ETH_RPC_URL)        throw new Error('ETH_RPC_URL not set')
  if (!process.env.WALLET_PRIVATE_KEY) throw new Error('WALLET_PRIVATE_KEY not set')
  const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL.trim())
  return new ethers.Wallet(process.env.WALLET_PRIVATE_KEY.trim(), provider)
}

async function broadcast(wallet, to, data) {
  const tx = await wallet.sendTransaction({ to, data })
  console.log(`    tx: https://etherscan.io/tx/${tx.hash}`)
  const receipt = await tx.wait()
  if (receipt.status === 0) throw new Error(`tx reverted: ${tx.hash}`)
  console.log(`    confirmed block ${receipt.blockNumber}`)
  return receipt
}

async function fetchSpec(cid) {
  const gateways = [
    `https://aquamarine-known-lark-882.mypinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
  ]
  let lastErr
  for (const url of gateways) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
      if (res.ok) {
        console.log(`    fetched from: ${url}`)
        return await res.json()
      }
    } catch (e) { lastErr = e }
  }
  throw new Error(`All IPFS gateways failed for ${cid}: ${lastErr?.message}`)
}

async function callMcp(tool, args) {
  const endpoint = process.env.AGI_ALPHA_MCP
  if (!endpoint) throw new Error('AGI_ALPHA_MCP not set')
  const res = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body:    JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name: tool, arguments: args } }),
    signal:  AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`MCP HTTP ${res.status} for tool=${tool}`)
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()
  if (contentType.includes('text/event-stream')) {
    for (const line of text.split('\n')) {
      if (!line.startsWith('data:')) continue
      try {
        const d = JSON.parse(line.slice(5).trim())
        if (d.result !== undefined) return unpackMcp(d.result)
        if (d.error) throw new Error(d.error.message || JSON.stringify(d.error))
      } catch (e) { if (e.message.startsWith('MCP')) throw e }
    }
    throw new Error(`No result in SSE stream for ${tool}`)
  }
  const d = JSON.parse(text)
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error))
  return unpackMcp(d.result)
}

function unpackMcp(result) {
  if (!result) return result
  if (result.content && Array.isArray(result.content)) {
    for (const item of result.content) {
      if (item.type === 'text') {
        try { return JSON.parse(item.text) } catch { return item.text }
      }
    }
  }
  return result
}

function parseCreateJobCalldata(mcpResult) {
  // Handle multiple possible response shapes from create_job MCP
  if (mcpResult?.approve && mcpResult?.createJob) {
    return { approve: mcpResult.approve, createJob: mcpResult.createJob }
  }
  if (mcpResult?.approve && mcpResult?.apply) {
    // Fallback: some versions use 'apply' key instead of 'createJob'
    return { approve: mcpResult.approve, createJob: mcpResult.apply }
  }
  if (Array.isArray(mcpResult?.transactions) && mcpResult.transactions.length >= 2) {
    return { approve: mcpResult.transactions[0], createJob: mcpResult.transactions[1] }
  }
  // Unknown shape — dump for debugging
  throw new Error(`Unexpected create_job response shape:\n${JSON.stringify(mcpResult, null, 2)}`)
}

function parseJobId(receipt) {
  const iface = new ethers.Interface(ABI1)
  const topic = iface.getEvent('JobCreated').topicHash
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === CONTRACT1.toLowerCase() && log.topics[0] === topic) {
      const decoded = iface.parseLog(log)
      return decoded.args[0].toString()
    }
  }
  // Fallback: first indexed uint256 in any log from Contract 1
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === CONTRACT1.toLowerCase() && log.topics.length >= 2) {
      return BigInt(log.topics[1]).toString()
    }
  }
  throw new Error('Could not extract jobId from receipt — check ABI1 JobCreated event signature')
}

function parseProcurementId(receipt) {
  const iface = new ethers.Interface(ABI2)
  const topic = iface.getEvent('ProcurementCreated').topicHash
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === CONTRACT2.toLowerCase() && log.topics[0] === topic) {
      const decoded = iface.parseLog(log)
      return decoded.args[0].toString()
    }
  }
  return null   // non-fatal if event parsing fails
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const w = getWallet()

  console.log('═'.repeat(62))
  console.log('  test_mainnet: createJob (C1) → createProcurement (C2)')
  console.log('═'.repeat(62))
  console.log(`  Employer  : ${w.address}`)
  console.log(`  Spec URI  : ${JOB_SPEC_URI}`)
  console.log(`  Contract1 : ${CONTRACT1}`)
  console.log(`  Contract2 : ${CONTRACT2}`)

  // ── 1. Fetch spec from IPFS ────────────────────────────────────────────────
  console.log('\n[1/5] Fetching job spec from IPFS...')
  const spec  = await fetchSpec(JOB_SPEC_CID)
  const props = spec.properties || {}
  const payout      = String(props.payoutAGIALPHA  || spec.attributes?.find(a => a.trait_type === 'Payout ($AGIALPHA)')?.value || 1000)
  const durationSec = Number(props.durationSeconds || spec.attributes?.find(a => a.trait_type === 'Duration (seconds)')?.value || 604800)
  const durationDays = Math.max(1, Math.ceil(durationSec / 86400))
  const details      = props.details || props.summary || spec.description || spec.name || 'Emperor_OS test job'
  console.log(`    title    : ${props.title || spec.name}`)
  console.log(`    payout   : ${payout} AGIALPHA`)
  console.log(`    duration : ${durationDays} day(s)`)

  // ── 2. Get create_job calldata from MCP ────────────────────────────────────
  console.log('\n[2/5] Getting create_job calldata from MCP...')
  const mcpResult = await callMcp('create_job', {
    jobSpecURI: JOB_SPEC_URI,
    payout,
    durationDays,
    details,
  })
  const { approve: approveTx, createJob: createJobTx } = parseCreateJobCalldata(mcpResult)
  console.log(`    approve to   : ${approveTx.to}`)
  console.log(`    createJob to : ${createJobTx.to}`)

  // ── 3. Broadcast ERC-20 approve ────────────────────────────────────────────
  console.log('\n[3/5] Broadcasting ERC-20 approve...')
  await broadcast(w, approveTx.to, approveTx.data)

  // ── 4. Broadcast createJob ─────────────────────────────────────────────────
  console.log('\n[4/5] Broadcasting createJob on Contract 1...')
  const createReceipt = await broadcast(w, createJobTx.to, createJobTx.data)
  const jobId = parseJobId(createReceipt)
  console.log(`    ✓ jobId = ${jobId}`)

  // ── 5. createProcurement on Contract 2 ────────────────────────────────────
  console.log('\n[5/5] Broadcasting createProcurement on Contract 2...')
  console.log(`    jobId              : ${jobId}`)
  console.log(`    commitDuration     : ${COMMIT_DURATION}s  (${COMMIT_DURATION / 86400}d)`)
  console.log(`    revealDuration     : ${REVEAL_DURATION}s  (${REVEAL_DURATION / 86400}d)`)
  console.log(`    finalistAcceptDur  : ${FINALIST_ACCEPT_DUR}s  (${FINALIST_ACCEPT_DUR / 86400}d)`)
  console.log(`    trialDuration      : ${TRIAL_DURATION}s  (${TRIAL_DURATION / 86400}d)`)
  console.log(`    scoreCommitDur     : ${SCORE_COMMIT_DUR}s  (${SCORE_COMMIT_DUR / 86400}d)`)
  console.log(`    scoreRevealDur     : ${SCORE_REVEAL_DUR}s  (${SCORE_REVEAL_DUR / 86400}d)`)

  const c2 = new ethers.Contract(CONTRACT2, ABI2, w)
  const procTx = await c2.createProcurement(
    BigInt(jobId),
    COMMIT_DURATION,
    REVEAL_DURATION,
    FINALIST_ACCEPT_DUR,
    TRIAL_DURATION,
    SCORE_COMMIT_DUR,
    SCORE_REVEAL_DUR,
  )
  console.log(`    tx: https://etherscan.io/tx/${procTx.hash}`)
  const procReceipt = await procTx.wait()
  if (procReceipt.status === 0) throw new Error(`createProcurement reverted: ${procTx.hash}`)
  console.log(`    confirmed block ${procReceipt.blockNumber}`)

  const procurementId = parseProcurementId(procReceipt)
  if (procurementId !== null) console.log(`    ✓ procurementId = ${procurementId}`)

  // ── Results ────────────────────────────────────────────────────────────────
  const results = {
    timestamp:    new Date().toISOString(),
    employer:     w.address,
    jobSpecURI:   JOB_SPEC_URI,
    jobId,
    procurementId,
    txHashes: {
      approve:            createReceipt.hash,  // same receipt contains both? No — see below
      createJob:          createReceipt.hash,
      createProcurement:  procReceipt.hash,
    },
    etherscan: {
      createJob:         `https://etherscan.io/tx/${createReceipt.hash}`,
      createProcurement: `https://etherscan.io/tx/${procReceipt.hash}`,
    },
    procurement: {
      commitDuration:        COMMIT_DURATION,
      revealDuration:        REVEAL_DURATION,
      finalistAcceptDuration: FINALIST_ACCEPT_DUR,
      trialDuration:         TRIAL_DURATION,
      scoreCommitDuration:   SCORE_COMMIT_DUR,
      scoreRevealDuration:   SCORE_REVEAL_DUR,
    },
  }
  writeFileSync(join(DIR, 'results.json'), JSON.stringify(results, null, 2))

  console.log('\n' + '═'.repeat(62))
  console.log('  DONE')
  console.log('═'.repeat(62))
  console.log(`\n  Job ID          : ${jobId}`)
  console.log(`  Procurement ID  : ${procurementId ?? '(check receipt logs)'}`)
  console.log(`  createJob tx    : https://etherscan.io/tx/${createReceipt.hash}`)
  console.log(`  createProc tx   : https://etherscan.io/tx/${procReceipt.hash}`)
  console.log(`\n  Monitor procurement: node ../../agi-agent/check_procurements.js`)
  console.log(`  Results saved   : tests/test_mainnet/results.json`)
}

run().catch(e => {
  console.error('\n[FATAL]', e.message)
  if (e.message.includes('createProcurement')) {
    console.error('\nHint: The createProcurement ABI in this script may need to be verified.')
    console.error('Check the write functions at: https://etherscan.io/address/0xd5ef1dde7ac60488f697ff2a7967a52172a78f29#writeContract')
  }
  process.exit(1)
})
