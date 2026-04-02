import { useMemo, useState } from 'react'
import { createJobRequest } from '../api'
import {
  DEFAULT_REQUEST_IMAGE,
  DURATION_SECONDS_BY_UI_VALUE,
  createDefaultJobRequestDraft,
  toLegacyJobRequestPayload,
} from '../models/jobSpecV2'

const DURATION_OPTIONS = [
  { label: '4 hours', value: '4h' },
  { label: '8 hours', value: '8h' },
  { label: '1 day', value: '1d' },
  { label: '3 days', value: '3d' },
  { label: '1 week', value: '7d' },
]


function normalizeIpfsUri(value) {
  const trimmed = (value || '').trim()
  return trimmed.startsWith('ipfs://') || trimmed.startsWith('https://') || trimmed.startsWith('http://')
    ? trimmed
    : ''
}

function makeIpfsUri(payload) {
  const json = JSON.stringify(payload)
  const bytes = new TextEncoder().encode(json)
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('')
  const encoded = btoa(binary).slice(0, 46)
  return `ipfs://${encoded}`
}

export function JobRequestTab() {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [category, setCategory] = useState('other')
  const [locale, setLocale] = useState('en-US')
  const [tagsInput, setTagsInput] = useState('')
  const [deliverablesInput, setDeliverablesInput] = useState('')
  const [acceptanceCriteriaInput, setAcceptanceCriteriaInput] = useState('')
  const [requirementsInput, setRequirementsInput] = useState('')
  const [duration, setDuration] = useState(DURATION_OPTIONS[2].value)
  const [payout, setPayout] = useState('100')
  const [chainId, setChainId] = useState('1')
  const [contract, setContract] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [plainText, setPlainText] = useState('')
  const [imageIpfsInput, setImageIpfsInput] = useState('')
  const [posting, setPosting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const tags = useMemo(
    () => tagsInput
      .split(',')
      .map(v => v.trim())
      .filter(Boolean),
    [tagsInput],
  )
  const deliverables = useMemo(
    () => deliverablesInput
      .split('\n')
      .map(v => v.trim())
      .filter(Boolean),
    [deliverablesInput],
  )
  const acceptanceCriteria = useMemo(
    () => acceptanceCriteriaInput
      .split('\n')
      .map(v => v.trim())
      .filter(Boolean),
    [acceptanceCriteriaInput],
  )
  const requirements = useMemo(
    () => requirementsInput
      .split('\n')
      .map(v => v.trim())
      .filter(Boolean),
    [requirementsInput],
  )

  const draft = useMemo(() => ({
    ...createDefaultJobRequestDraft(),
    title: title.trim(),
    summary: summary.trim(),
    details: plainText.trim(),
    category,
    locale: locale.trim() || 'en-US',
    tags,
    deliverables,
    acceptanceCriteria,
    requirements,
    payoutAGIALPHA: Number(payout),
    durationSeconds: DURATION_SECONDS_BY_UI_VALUE[duration] || DURATION_SECONDS_BY_UI_VALUE['1d'],
    chainId: Number(chainId),
    contract: contract.trim(),
    ...(createdBy.trim() ? { createdBy: createdBy.trim() } : {}),
  }), [
    title,
    summary,
    plainText,
    category,
    locale,
    tags,
    deliverables,
    acceptanceCriteria,
    requirements,
    payout,
    duration,
    chainId,
    contract,
    createdBy,
  ])

  const ipfsUri = useMemo(() => makeIpfsUri(draft), [draft])
  const customImageIpfsUri = normalizeIpfsUri(imageIpfsInput)
  const imageIpfsUri = customImageIpfsUri || DEFAULT_REQUEST_IMAGE

  async function handlePushJobRequest() {
    setPosting(true)
    setError('')
    setResult(null)
    try {
      const response = await createJobRequest(toLegacyJobRequestPayload(draft, {
        durationUiValue: duration,
        ipfsUri,
        imageUri: imageIpfsUri,
      }))
      setResult(response)
    } catch (e) {
      setError(e.message || 'Failed to push job request')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 space-y-4">
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider">Job Request Builder</div>
        <div className="text-sm text-slate-300 mt-1">Generate a ready-to-post request with an IPFS link and push it from Mission Control.</div>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-slate-400">Job title</span>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Build a competitor landscape for AI legal copilots"
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-slate-400">Summary</span>
        <input
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="One-line summary for quick scanning"
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-slate-400">Category</span>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="creative">creative</option>
            <option value="development">development</option>
            <option value="research">research</option>
            <option value="analysis">analysis</option>
            <option value="operations">operations</option>
            <option value="other">other</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-slate-400">Locale</span>
          <input
            value={locale}
            onChange={e => setLocale(e.target.value)}
            placeholder="en-US"
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-slate-400">Tags (comma-separated)</span>
        <input
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          placeholder="llm, legaltech, market-research"
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-slate-400">Deliverables (one per line)</span>
        <textarea
          rows={3}
          value={deliverablesInput}
          onChange={e => setDeliverablesInput(e.target.value)}
          placeholder="- Final report PDF&#10;- Source spreadsheet&#10;- Executive summary"
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-slate-400">Acceptance criteria (one per line)</span>
        <textarea
          rows={3}
          value={acceptanceCriteriaInput}
          onChange={e => setAcceptanceCriteriaInput(e.target.value)}
          placeholder="- Includes at least 5 competitors&#10;- Contains clear recommendation"
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-slate-400">Requirements (one per line)</span>
        <textarea
          rows={3}
          value={requirementsInput}
          onChange={e => setRequirementsInput(e.target.value)}
          placeholder="- Prior legal-tech research experience&#10;- English-only delivery"
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-slate-400">Image IPFS link (optional)</span>
        <input
          value={imageIpfsInput}
          onChange={e => setImageIpfsInput(e.target.value)}
          placeholder="ipfs://..."
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <div className="text-[11px] text-slate-500">
          If left empty, Mission Control uses the default job image.
        </div>
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-slate-400">Time</span>
          <select
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {DURATION_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-slate-400">Payout (AGIALPHA)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={payout}
            onChange={e => setPayout(e.target.value)}
            placeholder="100"
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-slate-400">Chain ID</span>
          <input
            type="number"
            min="1"
            step="1"
            value={chainId}
            onChange={e => setChainId(e.target.value)}
            placeholder="1"
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-slate-400">Contract address (optional)</span>
          <input
            value={contract}
            onChange={e => setContract(e.target.value)}
            placeholder="0x..."
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-slate-400">Created by (optional)</span>
        <input
          value={createdBy}
          onChange={e => setCreatedBy(e.target.value)}
          placeholder="ens-name.eth or wallet id"
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-slate-400">Plain text job brief</span>
        <textarea
          rows={7}
          value={plainText}
          onChange={e => setPlainText(e.target.value)}
          placeholder="Describe exactly what needs to be done, deliverables, and validation criteria..."
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>

      <div className="rounded border border-slate-700 bg-slate-950 p-3">
        <div className="text-xs text-slate-500 mb-1">IPFS link (auto-generated)</div>
        <div className="font-mono text-xs text-green-400 break-all">{ipfsUri}</div>
      </div>

      <div className="rounded border border-slate-700 bg-slate-950 p-3">
        <div className="text-xs text-slate-500 mb-1">Image link used for request</div>
        <div className="font-mono text-xs text-cyan-300 break-all">{imageIpfsUri}</div>
      </div>

      <button
        onClick={handlePushJobRequest}
        disabled={
          posting
          || !plainText.trim()
          || Number(payout) <= 0
          || !Number.isFinite(Number(payout))
          || Number(chainId) <= 0
          || !Number.isFinite(Number(chainId))
          || (imageIpfsInput.trim() && !customImageIpfsUri)
        }
        className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500"
      >
        {posting ? 'Pushing…' : 'Push job request'}
      </button>

      {Number(payout) <= 0 || !Number.isFinite(Number(payout)) ? (
        <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900 rounded p-2">
          Payout must be a positive number.
        </div>
      ) : null}

      {Number(chainId) <= 0 || !Number.isFinite(Number(chainId)) ? (
        <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900 rounded p-2">
          Chain ID must be a positive number.
        </div>
      ) : null}

      {imageIpfsInput.trim() && !customImageIpfsUri && (
        <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900 rounded p-2">
          Image link must start with <span className="font-mono">ipfs://</span>.
          You can also use <span className="font-mono">https://</span>.
        </div>
      )}

      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900 rounded p-2">{error}</div>}

      {result && (
        <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900 rounded p-2">
          Job request pushed.
          {result.tool && <span className="ml-1 text-emerald-200">tool: {result.tool}</span>}
          {result.jobId && <span className="ml-1 text-emerald-200">jobId: {result.jobId}</span>}
        </div>
      )}
    </div>
  )
}
