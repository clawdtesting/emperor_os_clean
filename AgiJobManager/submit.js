// Pin deliverable to IPFS, build completion metadata, submit on-chain

import { callMcp } from './mcp.js'
import { broadcastMcpTx } from './chain.js'

export async function submitCompletion(jobId, job, spec, workResult) {
  const { content, filename, mimeType, summary, validatorNote } = workResult

  // 1. Pin the deliverable file to Pinata directly
  console.log('  [submit] pinning deliverable...')
  const deliverableUri = await pinFile(content, filename, mimeType)
  const deliverableCid = deliverableUri.replace('ipfs://', '')
  console.log(`  [submit] deliverable: ${deliverableUri}`)

  // 2. Build AGI Alpha v1 completion metadata
  const props = spec?.properties || {}
  const title = props.title || spec?.name || `Job ${jobId}`
  const category = props.category || 'other'
  const specUri = job.specURI || ''

  const completionMetadata = {
    name: `AGI Job Completion · ${title}`,
    description: `Final completion package for Job ${jobId}. Resolves to deliverable via image field.`,
    image: deliverableUri,
    attributes: [
      { trait_type: 'Kind',               value: 'job-completion' },
      { trait_type: 'Job ID',             value: String(jobId) },
      { trait_type: 'Category',           value: category },
      { trait_type: 'Final Asset Type',   value: 'Markdown' },
      { trait_type: 'Locale',             value: 'en-US' },
      { trait_type: 'Completion Standard', value: 'Public IPFS deliverables' }
    ],
    properties: {
      schema:         'agijobmanager/job-completion/v1',
      kind:           'job-completion',
      version:        '1.0.0',
      locale:         'en-US',
      title,
      summary,
      jobId,
      jobSpecURI:        specUri,
      jobSpecGatewayURI: specUri.replace('ipfs://', 'https://ipfs.io/ipfs/'),
      finalDeliverables: [{
        name:        'Primary deliverable',
        uri:         deliverableUri,
        gatewayURI:  `https://ipfs.io/ipfs/${deliverableCid}`,
        description: summary
      }],
      validatorNote,
      completionStatus: 'submitted',
      chainId:   1,
      contract:  '0xB3AAeb69b630f0299791679c063d68d6687481d1',
      createdVia: process.env.ENS_SUBDOMAIN || 'emperor',
      generatedAt: new Date().toISOString()
    },
    external_url: specUri.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }

  // 3. Pin completion metadata via AGI Alpha MCP
  console.log('  [submit] pinning completion metadata...')
  const pinResult = await callMcp('upload_to_ipfs', {
    pinataJwt: process.env.PINATA_JWT,
    metadata:  completionMetadata,
    name:      `job-${jobId}-completion`
  })

  const completionUri = extractUri(pinResult)
  if (!completionUri) throw new Error(`No IPFS URI in upload_to_ipfs result: ${JSON.stringify(pinResult).slice(0, 200)}`)
  console.log(`  [submit] completion URI: ${completionUri}`)

  // 4. Get request_job_completion tx calldata from MCP
  console.log('  [submit] preparing completion tx...')
  const txData = await callMcp('request_job_completion', {
    jobId,
    completionURI: completionUri
  })

  // 5. Sign and broadcast
  console.log('  [submit] broadcasting completion tx...')
  const receipt = await broadcastMcpTx(txData)

  return {
    deliverableUri,
    completionUri,
    txHash: receipt.hash
  }
}

// Pin raw text/file to Pinata (pinFileToIPFS)
async function pinFile(content, filename, mimeType) {
  const jwt = process.env.PINATA_JWT
  if (!jwt) throw new Error('PINATA_JWT not set')

  const form = new FormData()
  form.append('file', new Blob([content], { type: mimeType }), filename)
  form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))
  form.append('pinataMetadata', JSON.stringify({ name: filename }))

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pinata error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  return `ipfs://${data.IpfsHash}`
}

function extractUri(result) {
  // Try direct string
  if (typeof result === 'string' && result.startsWith('ipfs://')) return result
  // Try nested
  const text = JSON.stringify(result)
  const match = text.match(/ipfs:\/\/[a-zA-Z0-9]+/)
  return match ? match[0] : null
}
